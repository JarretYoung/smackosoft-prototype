"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";
import { needsRefresh } from "@/src/lib/stale";

/**
 * When the browser last asked for a redraw. It lives here, not in the component, because a tab
 * switch unmounts the component and a reset would let rapid switching start a redraw per arrival.
 * Next drops a redraw that a navigation overtakes, so a late one never lands on the wrong page.
 */
let lastRefreshAt: number | null = null;

/**
 * Keeps a tab page true after the browser shows it from its cache. A tab opens at once from the
 * cache, and if that copy is older than `STALE_AFTER_MS` this draws the page again in the
 * background and swaps it in place, with no skeleton. It checks when the page appears and when
 * the browser tab comes back to the front. `renderedAt` is when the server drew the page.
 * Put it on read-only pages. A page with a form must not redraw under someone's hands.
 */
export function RefreshWhenStale({ renderedAt }: { renderedAt: number }) {
  const router = useRouter();
  const renderedAtRef = useRef(renderedAt);

  useEffect(() => {
    renderedAtRef.current = renderedAt;
  }, [renderedAt]);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!needsRefresh({ renderedAt: renderedAtRef.current, now, lastRefreshAt })) return;
      lastRefreshAt = now;
      startTransition(() => router.refresh());
    };
    check();
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [router]);

  return null;
}
