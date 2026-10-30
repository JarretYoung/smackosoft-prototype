import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TIMEZONE } from "@/src/config";
import { ZONE_COOKIE } from "@/src/lib/zone-cookie";
import { isZone } from "@/src/lib/zoned";

/**
 * The timezone of the person looking at the page, from the cookie their browser keeps.
 * A missing or unusable value falls back to `DEFAULT_TIMEZONE`, and the browser fixes it on arrival.
 * Reading it counts as reading the request, so a clock read after it is fine for a Server Component.
 */
export async function getViewerZone(): Promise<string> {
  const value = (await cookies()).get(ZONE_COOKIE)?.value;
  return value && isZone(value) ? value : DEFAULT_TIMEZONE;
}
