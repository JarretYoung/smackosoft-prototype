import { createClient } from "@/src/lib/supabase/server";
import { safeNext } from "@/src/lib/safe-redirect";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/** Where the provider sends the user back after "Continue with Google". */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  // Cancelled, expired or reused. The error page shows a fixed message.
  redirect("/auth/error");
}
