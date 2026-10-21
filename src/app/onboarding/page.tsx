import { redirect } from "next/navigation";
import { backend } from "@/src/server";
import { OnboardingForm } from "./onboarding-form";

export const instant = false;

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams;
  // Already onboarded: nothing to do here.
  const me = await backend.accounts.getCurrent();
  if (me.ok) redirect("/home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6">
      <div className="space-y-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
          S
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Smackosoft</h1>
        <p className="text-sm text-muted-foreground">
          Pick a name and a handle. Friends find you by your handle.
        </p>
      </div>
      <OnboardingForm claimCode={claim ?? ""} />
    </main>
  );
}
