import { refOf } from "../../lib/video-sources";

/**
 * Which video links play in the page. A link plays when its source has a player in `players/` (Video.js has a
 * media element for it). Anything else is not playable here and opens in a new tab.
 * Add a source: add its id here and its player to `players/index.tsx`. The type there will not compile until you do.
 */
export const PLAYABLE_SOURCES = ["youtube"] as const;
export type PlayableSource = (typeof PLAYABLE_SOURCES)[number];

export type Playable = {
  /** The link as saved. A source's player reads every link shape the source has. */
  link: string;
  /** Which player plays it. */
  source: PlayableSource;
  /** Whole seconds to start from. */
  start: number;
};

/** The sync point can be negative when the video began after the game did, and a video cannot start before 0. */
const startOf = (offset: number | null) => Math.max(0, Math.floor(offset ?? 0));

export function playableOf(link: string, offset: number | null): Playable | null {
  const source = refOf(link)?.source.id;
  const playable = PLAYABLE_SOURCES.find((id) => id === source);
  return playable ? { link, source: playable, start: startOf(offset) } : null;
}
