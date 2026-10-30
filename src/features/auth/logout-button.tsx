"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/src/features/auth/actions";

/** A white row with red text, the way a sign out sits in a grouped list. */
export function LogoutButton() {
  const [pending, start] = useTransition();
  const logout = () => start(() => signOut());

  return (
    <div className="group-list">
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className="pressable-row flex min-h-14 w-full items-center justify-center gap-2 font-semibold text-destructive"
      >
        <LogOut className="size-[1.125rem]" /> Log out
      </button>
    </div>
  );
}
