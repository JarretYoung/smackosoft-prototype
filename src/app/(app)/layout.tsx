import { redirect } from "next/navigation";
import { BottomNav } from "@/src/components/bottom-nav";
import { backend } from "@/src/server";

// Every page here reads the signed-in user, so none of it can be prerendered.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // A signed-in user without an account has not onboarded yet.
  const me = await backend.accounts.getCurrent();
  if (!me.ok) redirect("/onboarding");

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-24 shadow-sm md:border-x">
      {children}
      <BottomNav />
    </div>
  );
}
