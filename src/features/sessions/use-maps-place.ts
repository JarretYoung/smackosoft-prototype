"use client";

import { useEffect, useState } from "react";
import { lookupMapsPlace } from "@/src/features/sessions/maps-actions";
import { isShortMapsLink, parseMapsLink, type MapsLink } from "@/src/features/sessions/maps-link";
import { resolvePin, type SessionFormInitial } from "@/src/features/sessions/session-values";

/**
 * What a pasted maps link says about the place: its name, its pin and whether it is still being
 * looked up. A short link hides the place behind a redirect, so the server looks it up.
 */
export function useMapsPlace(
  locationUrl: string,
  location: string,
  initial: Pick<SessionFormInitial, "locationUrl" | "latitude" | "longitude">,
) {
  const mapsLink = locationUrl.trim() === "" ? null : parseMapsLink(locationUrl);
  // Keyed by link, so a new link never shows the last link's place.
  const [looked, setLooked] = useState<Record<string, MapsLink | null>>({});
  const shortLink = isShortMapsLink(locationUrl) ? locationUrl.trim() : null;
  const lookingUp = shortLink !== null && !(shortLink in looked);
  useEffect(() => {
    if (!shortLink || shortLink in looked) return;
    let current = true;
    const timer = setTimeout(async () => {
      const place = await lookupMapsPlace(shortLink);
      if (current) setLooked((l) => ({ ...l, [shortLink]: place }));
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [shortLink, looked]);

  const linkPlace = mapsLink?.name || mapsLink?.latitude != null ? mapsLink : shortLink ? (looked[shortLink] ?? null) : null;
  /** The name from the link, offered when the location says something else. */
  const mapsName = linkPlace?.name && linkPlace.name !== location.trim() ? linkPlace.name : null;
  const pin = resolvePin(linkPlace, locationUrl, initial);

  return { mapsLink, mapsName, lookingUp, pin };
}
