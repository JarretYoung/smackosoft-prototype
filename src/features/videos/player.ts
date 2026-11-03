import { youtubeIdOf } from "../../lib/video-source";

/**
 * Which video links play in the page. A link is playable when Video.js has a media element for it. Today
 * that is YouTube. Anything else is not playable here and opens in a new tab.
 * Add a provider by teaching `playableOf` one more link shape and `VideoPlayer` the element for it.
 */
export type Playable = {
  /** The link as saved. The YouTube element reads every YouTube link shape. */
  link: string;
  /** Whole seconds to start from. */
  start: number;
};

/** The poster frame YouTube keeps for every video, 16:9. A plain image address, no key needed. Null for other links. */
export function thumbnailOf(link: string): string | null {
  const id = youtubeIdOf(link);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** The sync point can be negative when the video began after the game did, and a video cannot start before 0. */
const startOf = (offset: number | null) => Math.max(0, Math.floor(offset ?? 0));

export function playableOf(link: string, offset: number | null): Playable | null {
  return youtubeIdOf(link) ? { link, start: startOf(offset) } : null;
}
