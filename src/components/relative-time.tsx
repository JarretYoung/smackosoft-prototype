"use client";

import { useEffect, useState } from "react";

const UNITS: [limit: number, size: number, name: string][] = [
  [60, 1, "s"],
  [3600, 60, "m"],
  [86400, 3600, "h"],
  [86400 * 30, 86400, "d"],
];

/** "just now", "5m ago", "2d ago". Older than a month shows the date. */
export function ago(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const unit = UNITS.find(([limit]) => seconds < limit);
  if (!unit) return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${Math.floor(seconds / unit[1])}${unit[2]} ago`;
}

/** Renders after mount, because the server and the viewer do not share a clock. */
export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(ago(iso)), [iso]);
  return <time dateTime={iso}>{text ?? ""}</time>;
}
