import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

export const instant = false;

/** The front door. Signed-in users land on Home, everyone else on the login page. */
export default async function Index() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims ? "/home" : "/auth/login");
}
