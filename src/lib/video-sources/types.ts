/**
 * What every video source (YouTube, and later Vimeo, Twitch, a file we host) tells the rest of the app.
 * The app is written against this and the registry in `index.ts`. It never names a source.
 * This file is for what both server and page need. Reading a length is server work (`server/video-lengths`),
 * and playing is page work (`features/videos/players`). Each has its own file per source.
 */
export interface VideoSource {
  /** The prefix of the source key, such as `youtube` in `youtube:dQw4w9WgXcQ`. */
  readonly id: string;
  /** The source's own id for the video a link points at, whatever shape the link has. Null when the link is not this source's. */
  idOf(link: string): string | null;
  /** A poster image for a video, or null when the source has none that an address alone can give. */
  thumbnailOf(id: string): string | null;
}

/** A link resolved to the source it belongs to. */
export type VideoRef = {
  source: VideoSource;
  /** The source's own id for the video. */
  id: string;
  /** Names the video across links and across sources, such as `youtube:dQw4w9WgXcQ`. */
  key: string;
};
