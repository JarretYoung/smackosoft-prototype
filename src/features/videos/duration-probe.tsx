"use client";

import { YouTubeVideo } from "@videojs/react/media/youtube-video";

/**
 * Loads a video out of sight to learn its length, and reports it once known.
 * It starts when it mounts, so mount it as soon as the link is known and key it by the link.
 * Nothing is reported for a link that cannot be read (private, blocked embed, offline).
 */
export function DurationProbe({ link, onDuration }: { link: string; onDuration: (seconds: number) => void }) {
  return (
    <div aria-hidden className="pointer-events-none fixed top-0 -left-[9999px] h-[120px] w-[200px] overflow-hidden">
      <YouTubeVideo
        src={link}
        muted
        onDurationChange={(event) => {
          const seconds = Math.round(event.currentTarget.duration);
          if (seconds > 0) onDuration(seconds);
        }}
      />
    </div>
  );
}
