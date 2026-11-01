"use client";

import type { YouTubeAdapter } from "@videojs/youtube-video";
import { Crosshair } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/src/components/ui/button";
import type { Playable } from "@/src/features/videos/player";
import { VideoPlayer } from "./video-player";

/**
 * A live look at the video while you set its sync point. The player follows the number: move the ruler
 * and it jumps there and waits. Or play it, pause on the moment every video shares, and tap
 * "Use this moment" to take the player's time as the sync point.
 * `seconds` is the current sync point. Negative values show the start, since a video cannot play before it.
 */
export function SyncPreview({
  playable,
  seconds,
  onUseCurrent,
}: {
  playable: Playable;
  seconds: number;
  onUseCurrent: (seconds: number) => void;
}) {
  const media = useRef<YouTubeAdapter>(null);
  // A player that has not started plays when it seeks, and pausing it straight away cancels the seek.
  // So the first move waits for it to play, then pauses it. After that it is paused or the viewer's to play.
  const started = useRef(false);
  const settling = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const player = media.current;
      if (!player) return;
      settling.current = !started.current;
      player.currentTime = Math.max(0, seconds);
      // If it never starts (autoplay blocked), do not pause the next time someone presses play.
      setTimeout(() => (settling.current = false), 3000);
    }, 250);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer
        playable={playable}
        mediaRef={media}
        onPlaying={() => {
          started.current = true;
          if (settling.current) {
            settling.current = false;
            media.current?.pause();
          }
        }}
      />
      <Button type="button" variant="secondary" onClick={() => onUseCurrent(Math.round(media.current?.currentTime ?? 0))}>
        <Crosshair /> Use this moment
      </Button>
    </div>
  );
}
