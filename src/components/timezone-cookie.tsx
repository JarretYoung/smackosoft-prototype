"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ZONE_COOKIE, zoneCookie } from "@/src/lib/zone-cookie";
import { browserZone } from "@/src/lib/zoned";

/**
 * Keeps the timezone cookie equal to the browser's. The server reads it to show every time on the
 * viewer's clock and to decide what "today" is. On a first visit, or after travelling, the page
 * has just been drawn with the old zone, so it is drawn again once.
 */
export function TimezoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const zone = browserZone();
    const stored = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${ZONE_COOKIE}=`))
      ?.slice(ZONE_COOKIE.length + 1);
    if (stored && decodeURIComponent(stored) === zone) return;
    document.cookie = zoneCookie(zone);
    router.refresh();
  }, [router]);
  return null;
}
