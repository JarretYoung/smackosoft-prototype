/**
 * The one place that knows which sources exist. Everything else asks a link what it is and gets back a
 * `VideoRef`, so no code outside this folder names a source or parses a link.
 * Add a source: write its file here (`idOf`, `thumbnailOf`), add it to `SOURCES`, then give it a length
 * reader (`server/video-lengths`) and a player (`features/videos/players`).
 */
import type { VideoRef, VideoSource } from "./types";
import { youtube } from "./youtube";

export type { VideoRef } from "./types";

const SOURCES: readonly VideoSource[] = [youtube];

/** The source and id a link points at, or null for a link no source claims. */
export function refOf(link: string): VideoRef | null {
  for (const source of SOURCES) {
    const id = source.idOf(link);
    if (id) return { source, id, key: `${source.id}:${id}` };
  }
  return null;
}

/**
 * Names the video a link points at, such as `youtube:dQw4w9WgXcQ`, whatever the link shape or extra
 * parameters (a playlist, a start time). Null for a link no source claims.
 */
export const sourceKeyOf = (link: string): string | null => refOf(link)?.key ?? null;

/** A poster image for the video a link points at, or null. */
export function thumbnailOf(link: string): string | null {
  const ref = refOf(link);
  return ref ? ref.source.thumbnailOf(ref.id) : null;
}
