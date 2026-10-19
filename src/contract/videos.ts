import { z } from "zod";
import { batch, UUID } from "./common";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

/** Creates a record only. Uploading to storage is not part of this call. */
export const VideoSave = z.object({
  id: UUID,
  label: z.string().trim().min(1),
  // Not decided: the storage scheme. `r2` is a placeholder. Never allow `javascript:` or `data:`.
  videoUrl: z.url({ protocol: /^(https?|r2)$/ }),
});
export const SaveVideosInput = batch(VideoSave, (v) => v.id);
export type SaveVideosInput = z.input<typeof SaveVideosInput>;

const linkageKey = (l: { videoId: string; sessionId: string; matchGameId: string | null }) =>
  `${l.videoId}:${l.sessionId}:${l.matchGameId ?? "-"}`;

/** matchGameId null links the video to the whole session. */
export const VideoLinkageSave = z.object({
  videoId: UUID,
  sessionId: UUID,
  matchGameId: UUID.nullable(),
  offsetSeconds: z.number().min(0),
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
  createdBy: string;
  createdAt: string;
};

export type VideoLinkage = {
  videoId: string;
  sessionId: string;
  matchGameId: string | null;
  offsetSeconds: number;
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
   * Two levels: matchGameId null links the whole session, otherwise one game of it.
   * The actor must be an EDITOR of the session and own the video, or the video must already be linked in the session.
   * Fails with CONFLICT if the game is not part of the session.
   */
  saveLinkages(input: SaveVideoLinkagesInput): Promise<Ack>;
  removeLinkages(input: RemoveVideoLinkagesInput): Promise<Ack>;
}
