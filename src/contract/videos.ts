import { z } from "zod";
import { batch, HttpUrl, UUID } from "./common";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

/** Creates a record only. Uploading to storage is not part of this call. */
export const VideoSave = z.object({
  id: UUID,
  label: z.string().trim().min(1),
  // Not decided: the storage scheme. `r2` is a placeholder. Never allow `javascript:` or `data:`.
  videoUrl: z.url({ protocol: /^(https?|r2)$/ }),
  thumbnailUrl: HttpUrl.nullish(),
});
export const SaveVideosInput = batch(VideoSave, (v) => v.id);
export type SaveVideosInput = z.input<typeof SaveVideosInput>;

/** A row of video_sessions. The video is in the session. */
export const VideoSessionKey = z.object({ videoId: UUID, sessionId: UUID });
export const SaveVideoSessionsInput = batch(VideoSessionKey, (v) => `${v.videoId}:${v.sessionId}`);
export type SaveVideoSessionsInput = z.input<typeof SaveVideoSessionsInput>;
export const RemoveVideoSessionsInput = batch(VideoSessionKey, (v) => `${v.videoId}:${v.sessionId}`);
export type RemoveVideoSessionsInput = z.input<typeof RemoveVideoSessionsInput>;

/** A row of video_games. The session comes from the game. */
export const VideoGameSave = z.object({
  videoId: UUID,
  matchGameId: UUID,
  // Seconds into the video where the game's canonical 0 happens. Negative if the video started after it.
  // Null means not synced yet.
  canonicalOffset: z.number().nullish(),
});
export const SaveVideoGamesInput = batch(VideoGameSave, (v) => `${v.videoId}:${v.matchGameId}`);
export type SaveVideoGamesInput = z.input<typeof SaveVideoGamesInput>;

export const VideoGameKey = z.object({ videoId: UUID, matchGameId: UUID });
export const RemoveVideoGamesInput = batch(VideoGameKey, (v) => `${v.videoId}:${v.matchGameId}`);
export type RemoveVideoGamesInput = z.input<typeof RemoveVideoGamesInput>;

export const ListOwnVideosInput = z.object({ sessionId: UUID.optional() }).optional();
export type ListOwnVideosInput = z.input<typeof ListOwnVideosInput>;

export const ListSessionVideosInput = z.object({ sessionId: UUID });
export type ListSessionVideosInput = z.input<typeof ListSessionVideosInput>;

// ----------------------------------------------------------------- outputs

export type Video = {
  id: string;
  label: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: string;
};

/** A video's place in a session (a video_sessions row) or in a game (a video_games row). */
export type VideoLink = {
  videoId: string;
  sessionId: string;
  /** Null for a video_sessions row, set for a video_games row. */
  matchGameId: string | null;
  /** Seconds. Null when not synced yet, and always null for a video_sessions row. */
  canonicalOffset: number | null;
  /** Display name of who last changed this link (made it, or last set its offset), and when. */
  changedByName: string;
  changedAt: string;
};

/** With a sessionId, `links` holds this video's links in that session. Otherwise it is empty. */
export type OwnVideo = Video & { links: VideoLink[] };

export type SessionVideo = VideoLink & { video: Video };

// --------------------------------------------------------------- interface

export interface VideosApi {
  listOwn(input?: ListOwnVideosInput): Promise<Result<OwnVideo[]>>;
  listBySession(input: ListSessionVideosInput): Promise<Result<SessionVideo[]>>;
  /** Creates records only. No storage upload. */
  save(input: SaveVideosInput): Promise<Ack>;
  /**
   * Puts the video in the session. The actor must be an EDITOR of the session
   * and own the video, or the video must already be in the session.
   */
  saveVideoSessions(input: SaveVideoSessionsInput): Promise<Ack>;
  /** Also removes the video's game links in that session. */
  removeVideoSessions(input: RemoveVideoSessionsInput): Promise<Ack>;
  /**
   * Links the video to a game, and puts it in the game's session if it is not there yet.
   * Saving again only updates the offset. Same access rule as saveVideoSessions, on the game's session.
   */
  saveVideoGames(input: SaveVideoGamesInput): Promise<Ack>;
  /** Keeps the video in the session. */
  removeVideoGames(input: RemoveVideoGamesInput): Promise<Ack>;
}
