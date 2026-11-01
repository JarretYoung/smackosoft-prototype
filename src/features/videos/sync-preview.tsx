"use client";

import type { YouTubeAdapter } from "@videojs/youtube-video";
import { useEffect, useRef } from "react";
import { roundOffset } from "@/src/features/videos/offset";
import type { Playable } from "@/src/features/videos/player";
import { VideoPlayer } from "./video-player";

/** Events from the player that follow a move we made ourselves are ours, not the viewer's. How long to ignore them. */
const QUIET_MS = 700;

/** If a player we nudged never starts (autoplay blocked), stop waiting for it. */
const SETTLE_GIVE_UP_MS = 4000;

/**
 * The video, kept in step with the sync point in both directions.
 * - Play it and pause on the serve: the sync point follows the player, so it is already on that moment.
 *   It follows while playing and again on a pause or a seek, including YouTube's own scrubber.
 * - Move the number (ruler, steps or typing): the player jumps there and waits.
 * `seconds` is the sync point, `onFollow` hands the player's time back. Negative values show the start,
 * since a video cannot play before it.
 */
export function SyncPreview({
  playable,
  seconds,
  onFollow,
}: {
  playable: Playable;
  seconds: number;
  onFollow: (seconds: number) => void;
}) {
  const media = useRef<YouTubeAdapter>(null);
  // Has the player ever played? A player that has not started plays when it seeks, and pausing it at once
  // cancels the seek. So the first move waits for it to play, pauses it, then seeks again, exactly, while paused.
  const started = useRef(false);
  const settling = useRef<number | null>(null);
  const quietUntil = useRef(0);
  // The last number we took from the player, so the effect below knows a change came from it.
  const fromPlayer = useRef<number | null>(null);

  const quiet = () => (quietUntil.current = performance.now() + QUIET_MS);

  /** Hands the player's time to the sync point, unless the player is only catching up with a move of ours. */
  function follow() {
    const player = media.current;
    if (!player || settling.current !== null || performance.now() < quietUntil.current) return;
    if (!Number.isFinite(player.currentTime)) return;
    fromPlayer.current = roundOffset(player.currentTime);
    onFollow(fromPlayer.current);
  }

  // The number moved (not by the player): take the player there.
  useEffect(() => {
    if (fromPlayer.current === seconds) return;
    const timer = setTimeout(() => {
      const player = media.current;
      if (!player) return;
      const target = Math.max(0, seconds);
      quiet();
      if (!started.current) {
        settling.current = target;
        player.currentTime = target;
        setTimeout(() => (settling.current = null), SETTLE_GIVE_UP_MS);
        return;
      }
      if (!player.paused) player.pause();
      player.currentTime = target;
    }, 150);
    return () => clearTimeout(timer);
  }, [seconds]);

  return (
    <VideoPlayer
      playable={playable}
      mediaRef={media}
      onPlaying={() => {
        started.current = true;
        // The first move has played long enough to show the frame. Pause it where it is.
        if (settling.current !== null) media.current?.pause();
      }}
      onPause={() => {
        const target = settling.current;
        if (target !== null) {
          // It ran on a little before it paused. Seek again, now that it is paused, to land exactly.
          settling.current = null;
          quiet();
          if (media.current) media.current.currentTime = target;
          return;
        }
        follow();
      }}
      onSeeked={follow}
      onTimeUpdate={() => {
        if (media.current && !media.current.paused) follow();
      }}
    />
  );
}
