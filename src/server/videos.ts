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

const videoColumns = [
  "videos.id",
  "videos.label",
  "videos.video_url",
  "videos.created_by",
  "videos.created_at",
] as const;

const toVideo = (row: {
  id: string;
  label: string;
  video_url: string;
  created_by: string;
  created_at: Date;
}): Video => ({
  id: row.id,
  label: row.label,
  videoUrl: row.video_url,
  createdBy: row.created_by,
  createdAt: row.created_at.toISOString(),
});

const offsetSeconds = sql<number>`extract(epoch from video_linkages.canonical_offset)`.as("offset_seconds");

const toLinkage = (row: {
  video_id: string;
  session_id: string;
  match_game_id: string | null;
  offset_seconds: number;
}): VideoLinkage => ({
  videoId: row.video_id,
  sessionId: row.session_id,
  matchGameId: row.match_game_id,
  offsetSeconds: row.offset_seconds,
});

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
  const linkages =
    sessionId && videos.length
      ? await db
          .selectFrom("video_linkages")
          .select(["video_id", "session_id", "match_game_id", offsetSeconds])
          .where("session_id", "=", sessionId)
          .where("video_id", "in", videos.map((v) => v.id))
          .execute()
      : [];
  return videos.map((v) => ({
    ...toVideo(v),
    linkages: linkages.filter((l) => l.video_id === v.id).map(toLinkage),
  }));
});

export const listSessionVideos = read(ListSessionVideosInput, async ({ db, actor }, { sessionId }): Promise<SessionVideo[]> => {
  requireRole(await rolesIn(db, actor, [sessionId]), sessionId, "VIEWER", ["sessionId"]);
  const rows = await db
    .selectFrom("video_linkages")
    .innerJoin("videos", "videos.id", "video_linkages.video_id")
    .select([...videoColumns, "video_linkages.video_id", "video_linkages.session_id", "video_linkages.match_game_id", offsetSeconds])
    .where("video_linkages.session_id", "=", sessionId)
    .orderBy("video_linkages.created_at")
    .execute();
  return rows.map((row) => ({ ...toLinkage(row), video: toVideo(row) }));
});

// ------------------------------------------------------------------ writes

/** Creates the record only. Uploading the file to storage is a separate step. */
export const saveVideos = write(SaveVideosInput, async ({ db, actor }, items) => {
  const written = await db
    .insertInto("videos")
    .values(items.map((v) => ({ id: v.id, label: v.label, video_url: v.videoUrl, created_by: actor.accountId })))
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          label: eb.ref("excluded.label"),
          video_url: eb.ref("excluded.video_url"),
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

  // The video is the actor's own, or already linked in this session.
  const videos = await db
    .selectFrom("videos")
    .select(["id", "created_by"])
    .where("id", "in", unique(items.map((l) => l.videoId)))
    .execute();
  const owner = new Map(videos.map((v) => [v.id, v.created_by]));
  const linked = await db
    .selectFrom("video_linkages")
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

  const row = (l: (typeof items)[number]) => ({
    video_id: l.videoId,
    session_id: l.sessionId,
    match_game_id: l.matchGameId,
    canonical_offset: sql<string>`make_interval(secs => ${l.offsetSeconds})`,
    created_by: actor.accountId,
  });
  // Two unique arbiters exist because match_game_id can be NULL, so two statements.
  const sessionLevel = items.filter((l) => l.matchGameId === null);
  const gameLevel = items.filter((l) => l.matchGameId !== null);
  if (sessionLevel.length) {
    await db
      .insertInto("video_linkages")
      .values(sessionLevel.map(row))
      .onConflict((oc) =>
        oc
          .columns(["video_id", "session_id"])
          .where("match_game_id", "is", null)
          .doUpdateSet((eb) => ({
            canonical_offset: eb.ref("excluded.canonical_offset"),
            updated_at: sql`now()`,
            updated_by: actor.accountId,
          })),
      )
      .execute();
  }
  if (gameLevel.length) {
    await db
      .insertInto("video_linkages")
      .values(gameLevel.map(row))
      .onConflict((oc) =>
        oc.columns(["video_id", "session_id", "match_game_id"]).doUpdateSet((eb) => ({
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
  await db
    .deleteFrom("video_linkages")
    .where((eb) =>
      eb.or(
        visible.map((l) =>
          eb.and([
            eb("video_id", "=", l.videoId),
            eb("session_id", "=", l.sessionId),
            l.matchGameId ? eb("match_game_id", "=", l.matchGameId) : eb("match_game_id", "is", null),
          ]),
        ),
      ),
    )
    .execute();
});
