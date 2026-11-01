import { sql } from "kysely";
import {
  ListOwnVideosInput,
  ListSessionVideosInput,
  RemoveVideoGamesInput,
  RemoveVideoSessionsInput,
  SaveVideoGamesInput,
  SaveVideoSessionsInput,
  SaveVideosInput,
  type OwnVideo,
  type SessionVideo,
  type Video,
  type VideoLink,
} from "../contract";
import {
  removableOnParents,
  requireOnParents,
  requireRole,
  rolesIn,
} from "./access";
import { sessionsOfGames, sessionsOfSessions } from "./queries/parents";
import { expectAll, read, stop, unique, write } from "./core";
import type { Db } from "./db/client";

const videoColumns = [
  "videos.id",
  "videos.label",
  "videos.video_url",
  "videos.thumbnail_url",
  "videos.duration_seconds",
  "videos.created_by",
  "videos.created_at",
] as const;

const toVideo = (row: {
  id: string;
  label: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  created_by: string;
  created_at: Date;
}): Video => ({
  id: row.id,
  label: row.label,
  videoUrl: row.video_url,
  thumbnailUrl: row.thumbnail_url,
  durationSeconds: row.duration_seconds,
  createdBy: row.created_by,
  createdAt: row.created_at.toISOString(),
});

const canonicalOffset = sql<number | null>`extract(epoch from video_games.canonical_offset)`.as("canonical_offset");

type Linked = { link: VideoLink; video: Video };

/** Session rows first, then game rows, each in the order they were made. */
async function linksIn(db: Db, sessionId: string, videoIds?: string[]): Promise<Linked[]> {
  let sessionRows = db
    .selectFrom("video_sessions")
    .innerJoin("videos", "videos.id", "video_sessions.video_id")
    .leftJoin("accounts as maker", "maker.id", "video_sessions.created_by")
    .select([...videoColumns, "maker.display_name as maker_name", "video_sessions.created_at as linked_at"])
    .where("video_sessions.session_id", "=", sessionId)
    .orderBy("video_sessions.created_at");
  let gameRows = db
    .selectFrom("video_games")
    .innerJoin("videos", "videos.id", "video_games.video_id")
    .innerJoin("match_games", "match_games.id", "video_games.match_game_id")
    .innerJoin("matches", "matches.id", "match_games.match_id")
    .leftJoin("accounts as maker", "maker.id", "video_games.created_by")
    .leftJoin("accounts as editor", "editor.id", "video_games.updated_by")
    .select([
      ...videoColumns,
      "video_games.match_game_id",
      "maker.display_name as maker_name",
      "editor.display_name as editor_name",
      "video_games.created_at as linked_at",
      "video_games.updated_at as edited_at",
      canonicalOffset,
    ])
    .where("matches.session_id", "=", sessionId)
    .orderBy("video_games.created_at");
  if (videoIds) {
    sessionRows = sessionRows.where("video_sessions.video_id", "in", videoIds);
    gameRows = gameRows.where("video_games.video_id", "in", videoIds);
  }
  const [inSession, inGames] = await Promise.all([sessionRows.execute(), gameRows.execute()]);
  return [
    ...inSession.map((row) => ({
      link: {
        videoId: row.id,
        sessionId,
        matchGameId: null,
        canonicalOffset: null,
        changedByName: row.maker_name ?? "Someone",
        changedAt: row.linked_at.toISOString(),
      },
      video: toVideo(row),
    })),
    ...inGames.map((row) => ({
      link: {
        videoId: row.id,
        sessionId,
        matchGameId: row.match_game_id,
        canonicalOffset: row.canonical_offset,
        // The last edit wins. A link that was never edited was last changed when it was made.
        changedByName: (row.edited_at ? row.editor_name : row.maker_name) ?? "Someone",
        changedAt: (row.edited_at ?? row.linked_at).toISOString(),
      },
      video: toVideo(row),
    })),
  ];
}

// ------------------------------------------------------------------- reads

export const listOwnVideos = read(ListOwnVideosInput, async ({ db, actor }, input): Promise<OwnVideo[]> => {
  const sessionId = input?.sessionId;
  if (sessionId) requireRole(await rolesIn(db, actor, [sessionId]), sessionId, "VIEWER", ["sessionId"]);

  const videos = await db
    .selectFrom("videos")
    .select(videoColumns)
    .where("videos.created_by", "=", actor.accountId)
    .orderBy("videos.created_at", "desc")
    .execute();
  const linked = sessionId && videos.length ? await linksIn(db, sessionId, videos.map((v) => v.id)) : [];
  return videos.map((v) => ({
    ...toVideo(v),
    links: linked.filter((l) => l.link.videoId === v.id).map((l) => l.link),
  }));
});

export const listSessionVideos = read(ListSessionVideosInput, async ({ db, actor }, { sessionId }): Promise<SessionVideo[]> => {
  requireRole(await rolesIn(db, actor, [sessionId]), sessionId, "VIEWER", ["sessionId"]);
  return (await linksIn(db, sessionId)).map(({ link, video }) => ({ ...link, video }));
});

// ------------------------------------------------------------------ writes

/** Creates the record only. Uploading the file to storage is a separate step. */
export const saveVideos = write(SaveVideosInput, async ({ db, actor }, items) => {
  const written = await db
    .insertInto("videos")
    .values(
      items.map((v) => ({
        id: v.id,
        label: v.label,
        video_url: v.videoUrl,
        thumbnail_url: v.thumbnailUrl ?? null,
        duration_seconds: v.durationSeconds ?? null,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          label: eb.ref("excluded.label"),
          video_url: eb.ref("excluded.video_url"),
          thumbnail_url: eb.ref("excluded.thumbnail_url"),
          duration_seconds: eb.ref("excluded.duration_seconds"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        .where("videos.created_by", "=", actor.accountId),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (v) => v.id, "Id already used");
});

/** The video is the actor's own, or already in the session. */
async function requireOwnOrInSession(db: Db, actor: { accountId: string }, items: { videoId: string; sessionId: string }[]) {
  const videoIds = unique(items.map((l) => l.videoId));
  const videos = await db.selectFrom("videos").select(["id", "created_by"]).where("id", "in", videoIds).execute();
  const owner = new Map(videos.map((v) => [v.id, v.created_by]));
  const linked = await db
    .selectFrom("video_sessions")
    .select(["video_id", "session_id"])
    .where("video_id", "in", videoIds)
    .where("session_id", "in", unique(items.map((l) => l.sessionId)))
    .execute();
  const inSession = new Set(linked.map((l) => `${l.video_id}:${l.session_id}`));
  items.forEach((l, index) => {
    if (owner.get(l.videoId) !== actor.accountId && !inSession.has(`${l.videoId}:${l.sessionId}`)) {
      stop("NOT_FOUND", [index, "videoId"], "Not found");
    }
  });
}

async function putInSessions(db: Db, actor: { accountId: string }, items: { videoId: string; sessionId: string }[]) {
  const rows = unique(items.map((l) => `${l.videoId}:${l.sessionId}`)).map((key) => {
    const [videoId, sessionId] = key.split(":");
    return { video_id: videoId, session_id: sessionId, created_by: actor.accountId };
  });
  await db
    .insertInto("video_sessions")
    .values(rows)
    .onConflict((oc) => oc.columns(["video_id", "session_id"]).doNothing())
    .execute();
}

export const saveVideoSessions = write(SaveVideoSessionsInput, async ({ db, actor }, items) => {
  const sessions = sessionsOfSessions(items.map((l) => l.sessionId));
  await requireOnParents(db, actor, items, (l) => l.sessionId, sessions, "EDITOR", "sessionId");
  await requireOwnOrInSession(db, actor, items);
  await putInSessions(db, actor, items);
});

export const saveVideoGames = write(SaveVideoGamesInput, async ({ db, actor }, items) => {
  const games = await sessionsOfGames(db, items.map((l) => l.matchGameId));
  await requireOnParents(db, actor, items, (l) => l.matchGameId, games, "EDITOR", "matchGameId");

  const inSessions = items.map((l) => ({ videoId: l.videoId, sessionId: games.get(l.matchGameId)!.sessionId }));
  await requireOwnOrInSession(db, actor, inSessions);
  await putInSessions(db, actor, inSessions);

  await db
    .insertInto("video_games")
    .values(
      items.map((l) => ({
        video_id: l.videoId,
        match_game_id: l.matchGameId,
        canonical_offset: l.canonicalOffset == null ? null : sql<string>`make_interval(secs => ${l.canonicalOffset})`,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc.columns(["video_id", "match_game_id"]).doUpdateSet((eb) => ({
        canonical_offset: eb.ref("excluded.canonical_offset"),
        updated_at: sql`now()`,
        updated_by: actor.accountId,
      })),
    )
    .execute();
});

export const removeVideoSessions = write(RemoveVideoSessionsInput, async ({ db, actor }, items) => {
  const sessions = sessionsOfSessions(items.map((l) => l.sessionId));
  const visible = await removableOnParents(db, actor, items, (l) => l.sessionId, sessions, "EDITOR", "sessionId");
  if (!visible.length) return;
  // The video's game links in that session go with it.
  await db
    .deleteFrom("video_games")
    .where((eb) => {
      const gamesOf = (sessionId: string) =>
        eb
          .selectFrom("match_games")
          .innerJoin("matches", "matches.id", "match_games.match_id")
          .select("match_games.id")
          .where("matches.session_id", "=", sessionId);
      return eb.or(visible.map((l) => eb.and([eb("video_id", "=", l.videoId), eb("match_game_id", "in", gamesOf(l.sessionId))])));
    })
    .execute();
  await db
    .deleteFrom("video_sessions")
    .where((eb) => eb.or(visible.map((l) => eb.and([eb("video_id", "=", l.videoId), eb("session_id", "=", l.sessionId)]))))
    .execute();
});

export const removeVideoGames = write(RemoveVideoGamesInput, async ({ db, actor }, items) => {
  const games = await sessionsOfGames(db, items.map((l) => l.matchGameId));
  const visible = await removableOnParents(db, actor, items, (l) => l.matchGameId, games, "EDITOR", "matchGameId");
  if (!visible.length) return;
  await db
    .deleteFrom("video_games")
    .where((eb) => eb.or(visible.map((l) => eb.and([eb("video_id", "=", l.videoId), eb("match_game_id", "=", l.matchGameId)]))))
    .execute();
});
