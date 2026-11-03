import type { Playable } from "@/src/features/videos/player";

/** What the page needs from any player, read and driven like a `<video>`. Every Video.js media element has it. */
export interface MediaHandle {
  currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  pause(): void;
}

/** The events the page listens to, whichever source plays. */
export type PlayerEvents = {
  onPlaying?: () => void;
  onPause?: () => void;
  onSeeked?: () => void;
  onTimeUpdate?: () => void;
};

/** What a source's player takes. It fills its parent, and starts again when `playable` changes. */
export type PlayerProps = PlayerEvents & {
  playable: Playable;
  autoplay: boolean;
  /** Hands out the player's `MediaHandle` once it exists, and null when it goes. */
  onMedia?: (media: MediaHandle | null) => void;
};
