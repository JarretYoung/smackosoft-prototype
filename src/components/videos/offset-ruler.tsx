"use client";

import { TapeRuler } from "@/src/components/tape-ruler";
import { formatOffset, OFFSET_LIMIT } from "@/src/lib/offset";

/** The tape ruler in whole seconds, for a video's sync point. Five seconds per tall tick. */
export function OffsetRuler({ value, onChange, className }: { value: number; onChange: (seconds: number) => void; className?: string }) {
  return (
    <TapeRuler
      value={value}
      onChange={onChange}
      min={-OFFSET_LIMIT}
      max={OFFSET_LIMIT}
      pxPerUnit={24}
      tickEvery={1}
      majorEvery={5}
      formatTick={formatOffset}
      ariaLabel="Sync point"
      valueText={`${formatOffset(value)} into the video`}
      className={className}
    />
  );
}
