"use client";

import { YouTubeVideo } from "@videojs/react/media/youtube-video";
import { useMemo } from "react";
import type { PlayerProps } from "./types";

/**
 * The YouTube media element, showing YouTube's own minimal controls. Everything that is only true of YouTube
 * lives here: its engine parameters, and its adapter behind `mediaRef`.
 */
export function YouTubePlayer({ playable, autoplay, onMedia, ...events }: PlayerProps) {
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
    <YouTubeVideo
      key={`${playable.link}#${playable.start}`}
      source={source}
      autoplay={autoplay}
      controls
      mediaRef={onMedia}
      {...events}
    />
  );
}
