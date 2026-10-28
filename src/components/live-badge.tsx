"use client";

import { useEffect, useState } from "react";

/** A "Now" pill while the session's planned window is running. Nothing otherwise. */
export function LiveBadge({ start, end, className }: { start: string | null; end: string | null; className?: string }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      setLive(!!start && !!end && now >= Date.parse(start) && now < Date.parse(end));
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [start, end]);
  if (!live) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary ${className ?? ""}`}
    >
      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
      Now
    </span>
  );
}
