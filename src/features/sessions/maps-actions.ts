"use server";

import { getClaims } from "@/src/lib/supabase/server";
import type { MapsLink } from "@/src/features/sessions/maps-link";
import { resolveMapsShortLink } from "@/src/features/sessions/maps-resolve";

/** The place behind a short maps link, for the session form. Only for signed in users. */
export async function lookupMapsPlace(link: string): Promise<MapsLink | null> {
  if (!(await getClaims())) return null;
  try {
    return await resolveMapsShortLink(link);
  } catch {
    // A slow or failed lookup is not an error. The form just has no suggestion.
    return null;
  }
}
