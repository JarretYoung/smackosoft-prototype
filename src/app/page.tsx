import { redirect } from "next/navigation";
import { getClaims } from "@/src/lib/supabase/server";

export const instant = false;

/** The front door. Signed-in users land on Home, everyone else on the login page. */
export default async function Index() {
  redirect((await getClaims()) ? "/home" : "/auth/login");
}
