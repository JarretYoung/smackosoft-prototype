"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { cn } from "@/src/lib/utils";

export type Chip<T extends string | number> = { value: T; label: string };

/**
 * One choice from a short row of capsules. The row scrolls sideways when it is longer than the screen,
 * and the chosen chip is brought into view when the row first shows. A finger scrolls it natively.
 * A mouse can drag it, and a drag never counts as a click on the chip it started on.
 */
export function ChipGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  /** The accessible name of the group. */
  label: string;
  value: T;
  options: Chip<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const chosen = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  useEffect(() => {
    chosen.current?.scrollIntoView({ block: "nearest", inline: "center" });
    // Only on first show. Later picks are already in view.
  }, []);

  function grab(e: PointerEvent<HTMLDivElement>) {
    const el = row.current;
    if (e.pointerType !== "mouse" || e.button !== 0 || !el) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    dragged.current = false;

    const move = (m: globalThis.PointerEvent) => {
      const dx = m.clientX - startX;
      // A few pixels of wobble is still a click.
      if (!dragged.current && Math.abs(dx) < 5) return;
      dragged.current = true;
      el.dataset.dragging = "true";
      el.scrollLeft = startLeft - dx;
    };
    const release = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      delete el.dataset.dragging;
      // The click that follows a drag arrives right after this. Clear the flag if none does.
      setTimeout(() => (dragged.current = false), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  return (
    <div
      ref={row}
      role="radiogroup"
      aria-label={label}
      onPointerDown={grab}
      onClickCapture={(e) => {
        if (!dragged.current) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "-mx-4 flex cursor-grab gap-2 overflow-x-auto px-4 [scrollbar-width:none] select-none data-[dragging=true]:cursor-grabbing [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            ref={on ? chosen : undefined}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "pressable h-11 shrink-0 rounded-full px-4 text-subhead outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              on ? "bg-primary font-semibold text-primary-foreground" : "bg-input text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
