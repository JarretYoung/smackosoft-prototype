"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";

/** A white row with red text, the way a sign out sits in a grouped list. */
export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="group-list">
      <button
        type="button"
        onClick={logout}
        className="pressable-row flex min-h-14 w-full items-center justify-center gap-2 font-semibold text-destructive"
      >
        <LogOut className="size-[1.125rem]" /> Log out
      </button>
    </div>
  );
}
