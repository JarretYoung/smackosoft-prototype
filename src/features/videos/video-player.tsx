"use client";

import { YouTubeVideo } from "@videojs/react/media/youtube-video";
import { NeutralVideoSkin, VideoPlayer as Player } from "@videojs/react/video";
import "@videojs/react/video/neutral-skin.css";
import type { YouTubeAdapter } from "@videojs/youtube-video";
import { useMemo, type Ref } from "react";
import type { Playable } from "@/src/features/videos/player";
import { cn } from "@/src/lib/utils";

/**
 * Plays a link in the page with Video.js: its lighter `NeutralVideoSkin` over the media element for the link.
 * YouTube is the only element today. It restarts when the link or start changes, which is how a new game
 * or sync point takes effect. `mediaRef` hands out the player, so a parent can read `currentTime`,
 * `duration` and call `pause()` the way it would on a `<video>`.
 */
export function VideoPlayer({
  playable,
  autoplay = false,
  mediaRef,
  onPlaying,
  className,
}: {
  playable: Playable;
  autoplay?: boolean;
  mediaRef?: Ref<YouTubeAdapter>;
  onPlaying?: () => void;
  className?: string;
}) {
  // Engine parameters are read once, when the embed is built, so a new start needs a new element.
  // The rest keep YouTube's own chrome as quiet as the embed allows: no related videos from other channels,
  // no annotations, and none of its keyboard shortcuts, since the skin has its own.
  const source = useMemo(
    () => ({
      src: playable.link,
      engine: { youtube: { start: playable.start, rel: 0, iv_load_policy: 3, disablekb: 1, color: "white" } as const },
    }),
    [playable.link, playable.start],
  );
  return (
    <Player>
      <NeutralVideoSkin className={cn("aspect-video w-full overflow-hidden rounded-2xl bg-black", className)}>
        <YouTubeVideo
          key={`${playable.link}#${playable.start}`}
          source={source}
          autoplay={autoplay}
          mediaRef={mediaRef}
          onPlaying={onPlaying}
        />
      </NeutralVideoSkin>
    </Player>
  );
}
