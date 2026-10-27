import { sql } from "kysely";
import {
  ListOwnVideosInput,
  ListSessionVideosInput,
  RemoveVideoLinkagesInput,
  SaveVideoLinkagesInput,
  SaveVideosInput,
  type OwnVideo,
  type SessionVideo,
  type Video,
  type VideoLinkage,
} from "../contract";
import { removableOnParents, requireOnParents, requireRole, rolesIn, sessionsOfGames, sessionsOfSessions } from "./access";
import { expectAll, read, stop, unique, write } from "./core";
import type { Db } from "./db/client";

const videoColumns = [
  "videos.id",
  "videos.label",
  "videos.video_url",
  "videos.thumbnail_url",
  "videos.created_by",
  "videos.created_at",
] as const;

const toVideo = (row: {
  id: string;
  label: string;
  video_url: string;
  thumbnail_url: string | null;
  created_by: string;
  created_at: Date;
}): Video => ({
  id: row.id,
  label: row.label,
  videoUrl: row.video_url,
  thumbnailUrl: row.thumbnail_url,
  createdBy: row.created_by,
  createdAt: row.created_at.toISOString(),
});

const offsetSeconds = sql<number | null>`extract(epoch from video_games.canonical_offset)`.as("offset_seconds");

type Linked = { linkage: VideoLinkage; video: Video };

/** Pool links first, then game links, each in the order they were made. */
async function linkagesIn(db: Db, sessionId: string, videoIds?: string[]): Promise<Linked[]> {
  let pool = db
    .selectFrom("video_sessions")
    .innerJoin("videos", "videos.id", "video_sessions.video_id")
    .leftJoin("accounts as maker", "maker.id", "video_sessions.created_by")
    .select([...videoColumns, "maker.display_name as maker_name", "video_sessions.created_at as linked_at"])
    .where("video_sessions.session_id", "=", sessionId)
    .orderBy("video_sessions.created_at");
  let games = db
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
      offsetSeconds,
    ])
    .where("matches.session_id", "=", sessionId)
    .orderBy("video_games.created_at");
  if (videoIds) {
    pool = pool.where("video_sessions.video_id", "in", videoIds);
    games = games.where("video_games.video_id", "in", videoIds);
  }
  const [poolRows, gameRows] = await Promise.all([pool.execute(), games.execute()]);
  return [
    ...poolRows.map((row) => ({
      linkage: {
        videoId: row.id,
        sessionId,
        matchGameId: null,
        offsetSeconds: null,
        changedBy: row.maker_name ?? "Someone",
        changedAt: row.linked_at.toISOString(),
      },
      video: toVideo(row),
    })),
    ...gameRows.map((row) => ({
      linkage: {
        videoId: row.id,
        sessionId,
        matchGameId: row.match_game_id,
        offsetSeconds: row.offset_seconds,
        // The last edit wins. A link that was never edited was last changed when it was made.
        changedBy: (row.edited_at ? row.editor_name : row.maker_name) ?? "Someone",
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
  const linked = sessionId && videos.length ? await linkagesIn(db, sessionId, videos.map((v) => v.id)) : [];
  return videos.map((v) => ({
    ...toVideo(v),
    linkages: linked.filter((l) => l.linkage.videoId === v.id).map((l) => l.linkage),
  }));
});

export const listSessionVideos = read(ListSessionVideosInput, async ({ db, actor }, { sessionId }): Promise<SessionVideo[]> => {
  requireRole(await rolesIn(db, actor, [sessionId]), sessionId, "VIEWER", ["sessionId"]);
  return (await linkagesIn(db, sessionId)).map(({ linkage, video }) => ({ ...linkage, video }));
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
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        .where("videos.created_by", "=", actor.accountId),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (v) => v.id, "Id already used");
});

export const saveVideoLinkages = write(SaveVideoLinkagesInput, async ({ db, actor }, items) => {
  const sessions = sessionsOfSessions(items.map((l) => l.sessionId));
  await requireOnParents(db, actor, items, (l) => l.sessionId, sessions, "EDITOR", "sessionId");

  // The video is the actor's own, or already in this session's pool.
  const videos = await db
    .selectFrom("videos")
    .select(["id", "created_by"])
    .where("id", "in", unique(items.map((l) => l.videoId)))
    .execute();
  const owner = new Map(videos.map((v) => [v.id, v.created_by]));
  const linked = await db
    .selectFrom("video_sessions")
    .select(["video_id", "session_id"])
    .where("video_id", "in", unique(items.map((l) => l.videoId)))
    .where("session_id", "in", unique(items.map((l) => l.sessionId)))
    .execute();
  const linkedPairs = new Set(linked.map((l) => `${l.video_id}:${l.session_id}`));
  items.forEach((l, index) => {
    const createdBy = owner.get(l.videoId);
    if (createdBy !== actor.accountId && !linkedPairs.has(`${l.videoId}:${l.sessionId}`)) {
      stop("NOT_FOUND", [index, "videoId"], "Not found");
    }
  });

  // A game-level linkage must point at a game of the same session.
  const games = await sessionsOfGames(db, items.flatMap((l) => (l.matchGameId ? [l.matchGameId] : [])));
  items.forEach((l, index) => {
    if (l.matchGameId && games.get(l.matchGameId)?.sessionId !== l.sessionId) {
      stop("CONFLICT", [index, "matchGameId"], "Game is not part of this session");
    }
  });

  // Every link puts the video in the pool. A game link adds its offset on top.
  const pool = unique(items.map((l) => `${l.videoId}:${l.sessionId}`)).map((key) => {
    const [videoId, sessionId] = key.split(":");
    return { video_id: videoId, session_id: sessionId, created_by: actor.accountId };
  });
  await db
    .insertInto("video_sessions")
    .values(pool)
    .onConflict((oc) => oc.columns(["video_id", "session_id"]).doNothing())
    .execute();

  const gameLinks = items.filter((l) => l.matchGameId !== null);
  if (gameLinks.length) {
    await db
      .insertInto("video_games")
      .values(
        gameLinks.map((l) => ({
          video_id: l.videoId,
          match_game_id: l.matchGameId!,
          canonical_offset: l.offsetSeconds == null ? null : sql<string>`make_interval(secs => ${l.offsetSeconds})`,
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
  }
});

export const removeVideoLinkages = write(RemoveVideoLinkagesInput, async ({ db, actor }, items) => {
  const sessions = sessionsOfSessions(items.map((l) => l.sessionId));
  const visible = await removableOnParents(db, actor, items, (l) => l.sessionId, sessions, "EDITOR", "sessionId");
  if (!visible.length) return;
  // A pool link takes the video's game links in that session with it. A game link leaves the pool alone.
  await db
    .deleteFrom("video_games")
    .where((eb) => {
      const gamesOf = (sessionId: string) =>
        eb
          .selectFrom("match_games")
          .innerJoin("matches", "matches.id", "match_games.match_id")
          .select("match_games.id")
          .where("matches.session_id", "=", sessionId);
      return eb.or(
        visible.map((l) =>
          eb.and([
            eb("video_id", "=", l.videoId),
            l.matchGameId ? eb("match_game_id", "=", l.matchGameId) : eb("match_game_id", "is not", null),
            eb("match_game_id", "in", gamesOf(l.sessionId)),
          ]),
        ),
      );
    })
    .execute();
  const pool = visible.filter((l) => l.matchGameId === null);
  if (pool.length) {
    await db
      .deleteFrom("video_sessions")
      .where((eb) => eb.or(pool.map((l) => eb.and([eb("video_id", "=", l.videoId), eb("session_id", "=", l.sessionId)]))))
      .execute();
  }
});
