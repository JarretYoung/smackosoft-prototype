"use client";

import { TapeRuler } from "@/src/components/tape-ruler";
import { formatOffset, FRAMES_PER_SECOND, OFFSET_LIMIT } from "@/src/features/videos/offset";

/**
 * The tape ruler for a video's sync point, one tick per frame step (a 30th of a second) and one labeled tick
 * per second. It is for the last bit of fine tuning: a second is a full 240px of tape. Move far with the video's own controls.
 * The tape counts whole steps, so there is no rounding to chase. The value in and out is in seconds.
 */
export function OffsetRuler({ value, onChange, className }: { value: number; onChange: (seconds: number) => void; className?: string }) {
  return (
    <TapeRuler
      value={Math.round(value * FRAMES_PER_SECOND)}
      onChange={(steps) => onChange(steps / FRAMES_PER_SECOND)}
      min={-OFFSET_LIMIT * FRAMES_PER_SECOND}
      max={OFFSET_LIMIT * FRAMES_PER_SECOND}
      pxPerUnit={8}
      tickEvery={1}
      majorEvery={FRAMES_PER_SECOND}
      formatTick={(steps) => formatOffset(steps / FRAMES_PER_SECOND)}
      ariaLabel="Sync point"
      valueText={`${formatOffset(value)} into the video`}
      className={className}
    />
  );
}
