"use server";

import { createClient } from "@/src/lib/supabase/server";
import type { MapsLink } from "@/src/lib/maps-link";
import { resolveMapsShortLink } from "@/src/lib/maps-resolve";

/** The place behind a short maps link, for the session form. Only for signed in users. */
export async function lookupMapsPlace(link: string): Promise<MapsLink | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return null;
  try {
    return await resolveMapsShortLink(link);
  } catch {
    // A slow or failed lookup is not an error. The form just has no suggestion.
    return null;
  }
}
