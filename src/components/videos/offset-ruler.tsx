"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatOffset, OFFSET_LIMIT } from "@/src/lib/offset";
import { cn } from "@/src/lib/utils";

const PX_PER_SECOND = 24;
const REACH = 12; // ticks drawn each side of the needle, enough to fill a wide phone
const MIN = -OFFSET_LIMIT;
const clamp = (n: number) => Math.max(MIN, Math.min(OFFSET_LIMIT, n));

/**
 * A graduated tape under a fixed needle, like the iOS trim control. Drag the tape and
 * whatever sits under the needle is the value, in whole seconds. Arrow keys step by one
 * second, and by five with Shift. The parent owns the value, so a typed value moves the tape.
 */
export function OffsetRuler({ value, onChange, className }: { value: number; onChange: (seconds: number) => void; className?: string }) {
  // The tape moves smoothly while dragging and snaps to a whole second on release.
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
    // The tape follows the finger, so moving right brings earlier times under the needle.
    const next = clamp(drag.current.startRaw - (e.clientX - drag.current.startX) / PX_PER_SECOND);
    setRaw(next);
    if (Math.round(next) !== value) onChange(Math.round(next));
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    setRaw(value);
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 5 : 1;
    const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
    if (!delta) return;
    e.preventDefault();
    onChange(clamp(value + delta));
  }

  const from = Math.floor(raw) - REACH;
  const ticks = Array.from({ length: REACH * 2 + 2 }, (_, i) => from + i);

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Sync point"
      aria-valuemin={MIN}
      aria-valuemax={OFFSET_LIMIT}
      aria-valuenow={value}
      aria-valuetext={`${formatOffset(value)} into the video`}
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
        style={{ transform: `translateX(${-raw * PX_PER_SECOND}px)` }}
      >
        {ticks.map((t) => {
          const major = t % 5 === 0;
          return (
            <div key={t} className="absolute inset-y-0" style={{ left: t * PX_PER_SECOND }}>
              <span
                className={cn("absolute bottom-3 left-0 w-px -translate-x-1/2 rounded-full", major ? "h-7 bg-foreground/50" : "h-4 bg-foreground/25")}
              />
              {major && (
                <span className="absolute top-3 left-0 -translate-x-1/2 text-[0.6875rem] font-medium text-muted-foreground tabular-nums">
                  {formatOffset(t)}
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
