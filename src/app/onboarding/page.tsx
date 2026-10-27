import { redirect } from "next/navigation";
import { AuthShell } from "@/src/components/auth-shell";
import { backend } from "@/src/server";
import { OnboardingForm } from "./onboarding-form";

export const instant = false;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams;
  // Already onboarded: nothing to do here.
  const me = await backend.accounts.getCurrent();
  if (me.ok) redirect("/home");

  return (
    <AuthShell title="Pick your name" description="Friends find you by your handle.">
      <OnboardingForm claimCode={claim ?? ""} />
    </AuthShell>
  );
}
