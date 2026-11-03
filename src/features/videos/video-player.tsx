"use client";

import type { Playable } from "@/src/features/videos/player";
import { PLAYERS, type PlayerProps } from "@/src/features/videos/players";
import { cn } from "@/src/lib/utils";

/**
 * Plays a video in the page. Which player runs comes from the video's source (`players/`), and this component
 * knows no source by name. Video.js is the wrapper that makes the player ours to drive: `onMedia` hands out
 * a `MediaHandle`, so a parent reads `currentTime` and `duration` and calls `pause()` like on a `<video>`, and
 * the media events (`onTimeUpdate`, `onPause`, `onSeeked`, `onPlaying`) arrive as React props.
 * It restarts when the link or start changes, which is how a new game or sync point takes effect.
 */
export function VideoPlayer({
  playable,
  autoplay = false,
  className,
  ...rest
}: { playable: Playable; autoplay?: boolean; className?: string } & Omit<PlayerProps, "playable" | "autoplay">) {
  const Player = PLAYERS[playable.source];
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black [&_iframe]:absolute [&_iframe]:inset-0", className)}>
      <Player playable={playable} autoplay={autoplay} {...rest} />
    </div>
  );
}
