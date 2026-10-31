"use client";

import { useEffect, useState } from "react";

/** True while the session's planned window is running. It checks again every minute. */
function useRunning(start: string | null, end: string | null): boolean {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setRunning(!!start && !!end && now >= Date.parse(start) && now < Date.parse(end));
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [start, end]);
  return running;
}

/** A "Now" pill while the session's planned window is running. Nothing otherwise. */
export function LiveBadge({ start, end, className }: { start: string | null; end: string | null; className?: string }) {
  if (!useRunning(start, end)) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-footnote font-bold text-primary ${className ?? ""}`}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      Now
    </span>
  );
}

/** A red "Now" and a dot in front of a list row's time while the session is running. Nothing otherwise. */
export function NowMark({ start, end }: { start: string | null; end: string | null }) {
  if (!useRunning(start, end)) return null;
  return (
    <>
      <span className="font-semibold text-primary">Now</span>
      <span className="text-muted-foreground">{" · "}</span>
    </>
  );
}
