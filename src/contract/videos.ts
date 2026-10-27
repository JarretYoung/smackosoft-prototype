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

const linkageKey = (l: { videoId: string; sessionId: string; matchGameId: string | null }) =>
  `${l.videoId}:${l.sessionId}:${l.matchGameId ?? "-"}`;

/**
 * matchGameId null puts the video in the session pool, with no offset.
 * A game link may leave offsetSeconds null, which means not synced yet.
 */
export const VideoLinkageSave = z
  .object({
    videoId: UUID,
    sessionId: UUID,
    matchGameId: UUID.nullable(),
    // Seconds into the video where the game's canonical 0 happens. Negative if the video started after it.
    offsetSeconds: z.number().nullish(),
  })
  .refine((l) => l.matchGameId !== null || l.offsetSeconds == null, {
    path: ["offsetSeconds"],
    message: "A session link has no offset",
  });
export const SaveVideoLinkagesInput = batch(VideoLinkageSave, linkageKey);
export type SaveVideoLinkagesInput = z.input<typeof SaveVideoLinkagesInput>;

export const VideoLinkageKey = z.object({
  videoId: UUID,
  sessionId: UUID,
  matchGameId: UUID.nullable(),
});
export const RemoveVideoLinkagesInput = batch(VideoLinkageKey, linkageKey);
export type RemoveVideoLinkagesInput = z.input<typeof RemoveVideoLinkagesInput>;

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

export type VideoLinkage = {
  videoId: string;
  sessionId: string;
  /** Null for the session pool. */
  matchGameId: string | null;
  /** Null when not synced yet, and always null in the pool. */
  offsetSeconds: number | null;
  /** Who last changed this link (made it, or last set its offset) and when. */
  changedBy: string;
  changedAt: string;
};

/** With a sessionId, `linkages` holds this video's linkages in that session. Otherwise it is empty. */
export type OwnVideo = Video & { linkages: VideoLinkage[] };

export type SessionVideo = VideoLinkage & { video: Video };

// --------------------------------------------------------------- interface

export interface VideosApi {
  listOwn(input?: ListOwnVideosInput): Promise<Result<OwnVideo[]>>;
  listBySession(input: ListSessionVideosInput): Promise<Result<SessionVideo[]>>;
  /** Creates records only. No storage upload. */
  save(input: SaveVideosInput): Promise<Ack>;
  /**
   * Two levels: matchGameId null puts the video in the session pool, otherwise it links one game of it.
   * A game link also adds the video to the pool. Saving again only updates the offset.
   * The actor must be an EDITOR of the session and own the video, or the video must already be in the pool.
   * Fails with CONFLICT if the game is not part of the session.
   */
  saveLinkages(input: SaveVideoLinkagesInput): Promise<Ack>;
  /** Removing a pool link also removes the video's game links in that session. Removing a game link keeps the pool link. */
  removeLinkages(input: RemoveVideoLinkagesInput): Promise<Ack>;
}
