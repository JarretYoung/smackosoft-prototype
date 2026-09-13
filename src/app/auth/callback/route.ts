import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * Only same-origin paths are accepted, so a crafted `next` such as
 * "//evil.com" or "https://evil.com" cannot turn this into an open redirect.
 */
function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next.startsWith("/\\")) return "/";
  return next;
}

// OAuth providers (Google) land here with a PKCE code to exchange for a session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // The provider sends the user back with an error instead of a code when they
  // cancel the consent screen or the provider is misconfigured.
  const providerError =
    searchParams.get("error_description") ?? "No auth code provided";
  redirect(`/auth/error?error=${encodeURIComponent(providerError)}`);
}
