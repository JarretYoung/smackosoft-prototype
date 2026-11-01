"use client";

import { YouTubeVideo, type YouTubeVideoProps } from "@videojs/react/media/youtube-video";
import type { YouTubeAdapter } from "@videojs/youtube-video";
import { useMemo, type Ref } from "react";
import type { Playable } from "@/src/features/videos/player";
import { cn } from "@/src/lib/utils";

type PlayerEvents = Pick<YouTubeVideoProps, "onPlaying" | "onPause" | "onSeeked" | "onTimeUpdate">;

/**
 * Plays a link in the page with Video.js: the YouTube media element, showing YouTube's own minimal controls.
 * Video.js is the wrapper that makes the player ours to drive: `mediaRef` hands out the adapter, so a parent
 * reads `currentTime` and `duration` and calls `pause()` like on a `<video>`, and the media events
 * (`onTimeUpdate`, `onPause`, `onSeeked`, `onPlaying`) arrive as React props.
 * It restarts when the link or start changes, which is how a new game or sync point takes effect.
 */
export function VideoPlayer({
  playable,
  autoplay = false,
  mediaRef,
  className,
  ...events
}: {
  playable: Playable;
  autoplay?: boolean;
  mediaRef?: Ref<YouTubeAdapter>;
  className?: string;
} & PlayerEvents) {
  // Engine parameters are read once, when the embed is built, so a new start needs a new element.
  // Related videos stay on the same channel, annotations are off, and the controls are white.
  // YouTube's keyboard shortcuts are off: its frame step (, and .) and jump to a percent (0 to 9) would move the
  // video without the sync sheet knowing, or fire while typing a time. It is all or nothing, so space and the arrows go too.
  const source = useMemo(
    () => ({
      src: playable.link,
      engine: { youtube: { start: playable.start, rel: 0, iv_load_policy: 3, disablekb: 1, color: "white" } as const },
    }),
    [playable.link, playable.start],
  );
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-2xl bg-black [&_iframe]:absolute [&_iframe]:inset-0", className)}>
      <YouTubeVideo
        key={`${playable.link}#${playable.start}`}
        source={source}
        autoplay={autoplay}
        controls
        mediaRef={mediaRef}
        {...events}
      />
    </div>
  );
}
