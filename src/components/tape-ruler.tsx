"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/src/lib/utils";

const REACH_PX = 300; // tape drawn each side of the needle, enough to fill a wide phone

/**
 * A graduated tape under a fixed needle, like the iOS trim control. Drag the tape and
 * whatever sits under the needle is the value, snapped to `step`. Arrow keys move by `step`,
 * and by `bigStep` with Shift. The parent owns the value, so a typed value moves the tape.
 * Units are up to the caller: seconds for a video, minutes for a time of day or a length.
 */
export function TapeRuler({
  value,
  onChange,
  min,
  max,
  pxPerUnit,
  tickEvery,
  majorEvery,
  step = tickEvery,
  bigStep = majorEvery,
  formatTick,
  marks,
  ariaLabel,
  valueText,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Tape width of one unit. */
  pxPerUnit: number;
  /** Units between small ticks. */
  tickEvery: number;
  /** Units between tall, labeled ticks. A multiple of `tickEvery`. */
  majorEvery: number;
  /** What the value snaps to. */
  step?: number;
  /** The arrow key step with Shift held. */
  bigStep?: number;
  /** The label under a tall tick. */
  formatTick: (tick: number) => string;
  /** Points where something new starts, such as the next day. Drawn as a line and a pill, and the tape after it is tinted. */
  marks?: { at: number; label: string }[];
  ariaLabel: string;
  /** The value in words, for screen readers. */
  valueText: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  // The tape moves smoothly while dragging and snaps on release.
  const [raw, setRaw] = useState(value);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startRaw: number } | null>(null);

  useEffect(() => {
    if (!drag.current) setRaw(value);
  }, [value]);

  function down(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startRaw: raw };
    setDragging(true);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    // The tape follows the finger, so moving right brings earlier values under the needle.
    const next = clamp(drag.current.startRaw - (e.clientX - drag.current.startX) / pxPerUnit);
    setRaw(next);
    const snapped = clamp(Math.round(next / step) * step);
    if (snapped !== value) onChange(snapped);
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setRaw(value);
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const size = e.shiftKey ? bigStep : step;
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? size : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -size : 0;
    if (!delta) return;
    e.preventDefault();
    onChange(clamp(value + delta));
  }

  const reach = Math.ceil(REACH_PX / pxPerUnit / tickEvery) * tickEvery;
  const first = Math.floor(raw / tickEvery) * tickEvery - reach;
  const ticks = Array.from({ length: (reach * 2) / tickEvery + 2 }, (_, i) => first + i * tickEvery).filter((t) => t >= min && t <= max);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      className={cn(
        "relative h-24 cursor-grab touch-pan-y overflow-hidden rounded-2xl bg-muted select-none active:cursor-grabbing",
        "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn("absolute inset-y-0 left-1/2 w-0", !dragging && "transition-transform duration-150 ease-out")}
        style={{ transform: `translateX(${-raw * pxPerUnit}px)` }}
      >
        {marks?.map((mark) => (
          <div key={mark.at} className="absolute inset-y-0" style={{ left: mark.at * pxPerUnit }}>
            <span className="absolute inset-y-0 left-0 w-[4000px] bg-primary/10" />
            <span className="absolute inset-y-0 left-0 -translate-x-px border-l-2 border-dashed border-foreground/50" />
            <span className="absolute top-2 left-1.5 rounded-full bg-foreground px-2 py-0.5 text-caption font-semibold whitespace-nowrap text-background">
              {mark.label}
            </span>
          </div>
        ))}
        {ticks.map((t) => {
          const major = t % majorEvery === 0;
          // The pill takes the place of the label at a mark.
          const marked = marks?.some((mark) => mark.at === t);
          return (
            <div key={t} className="absolute inset-y-0" style={{ left: t * pxPerUnit }}>
              <span
                className={cn("absolute bottom-3 left-0 w-px -translate-x-1/2 rounded-full", major ? "h-7 bg-foreground/50" : "h-4 bg-foreground/25")}
              />
              {major && !marked && (
                <span className="absolute top-3 left-0 -translate-x-1/2 text-caption font-medium whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatTick(t)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Edges fade out so the tape reads as continuing past the frame. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-muted to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-muted to-transparent" />

      {/* The needle. */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 size-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-primary"
      />
    </div>
  );
}
