import { redirect } from "next/navigation";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { AvatarUrl } from "@/src/contract";
import { getClaims } from "@/src/lib/supabase/server";
import { backend } from "@/src/server";
import { OnboardingForm } from "@/src/features/onboarding/onboarding-form";

export const instant = false;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams;
  // Already onboarded: nothing to do here.
  const me = await backend.accounts.getCurrent();
  if (me.ok) redirect("/home");

  // Google hands back the name on the account. Email sign ups have none, so the field stays empty.
  const meta = (await getClaims())?.user_metadata;
  const providerName = [meta?.full_name, meta?.name].find((v) => typeof v === "string" && v.trim());
  // Google sends a 96px picture. Ask for a sharper one, the largest avatar is 80px on a 2x screen.
  const picture = [meta?.picture, meta?.avatar_url].find((v) => typeof v === "string");
  const parsedPicture = AvatarUrl.safeParse(picture?.replace(/=s96-c$/, "=s256-c"));

  return (
    <AuthShell
      title={claim ? "Claim your guest account" : "Pick your name"}
      description={claim ? "Your matches and history come with you." : "Friends find you by your handle."}
    >
      <OnboardingForm
        claimCode={claim ?? ""}
        suggestedName={providerName?.trim() ?? ""}
        avatarUrl={parsedPicture.success ? parsedPicture.data : null}
      />
    </AuthShell>
  );
}
