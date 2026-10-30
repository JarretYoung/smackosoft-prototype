"use client";

import { useEffect, useState } from "react";
import { isHandleFree } from "@/src/features/accounts/actions";

export type HandleCheck =
  /** Nothing to say: empty, or still the handle the person already has. */
  | { status: "idle" }
  | { status: "short" }
  | { status: "badChars" }
  | { status: "checking" }
  | { status: "free" }
  | { status: "taken" };

/** What a handle looks like once typed. Same rule as the contract: 3 to 30 of a-z, 0-9, _. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Check a handle while it is typed. Format problems are known at once. Whether it is taken
 * needs the server, so that waits for a short pause in typing and ignores answers that arrive late.
 * Pass `own` for the handle the person already holds, which needs no check.
 */
export function useHandleCheck(raw: string, own?: string): HandleCheck {
  const handle = normalizeHandle(raw);
  const [answer, setAnswer] = useState<{ handle: string; free: boolean } | null>(null);

  const formatOk = /^[a-z0-9_]{3,30}$/.test(handle);
  const needsCheck = formatOk && handle !== own;

  useEffect(() => {
    if (!needsCheck) return;
    let stale = false;
    const timer = setTimeout(async () => {
      const result = await isHandleFree({ handle });
      if (!stale && result.ok) setAnswer({ handle, free: result.data });
    }, 350);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [handle, needsCheck]);

  if (handle === "" || handle === own) return { status: "idle" };
  if (/[^a-z0-9_]/.test(handle)) return { status: "badChars" };
  if (handle.length < 3) return { status: "short" };
  if (!formatOk) return { status: "badChars" };
  if (answer?.handle === handle) return { status: answer.free ? "free" : "taken" };
  return { status: "checking" };
}
