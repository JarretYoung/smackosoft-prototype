"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClaimCode, removeGuests } from "@/src/features/accounts/actions";
import type { Guest } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";

export type GuestDialog =
  | { kind: "add" }
  | { kind: "edit"; guest: Guest }
  | { kind: "delete"; guest: Guest }
  | { kind: "claim"; guest: Guest; code: string };

/** Which sheet or dialog is open, and the actions that need no form: delete a guest, make a claim code. */
export function useGuestsPanel() {
  const [dialog, setDialog] = useState<GuestDialog | null>(null);
  /** The add or edit form stays mounted after closing, so the sheet does not empty while it slides away. */
  const [formTarget, setFormTarget] = useState<{ guest?: Guest; key: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const close = () => setDialog(null);
  const openForm = (guest?: Guest) => {
    setFormTarget((current) => ({ guest, key: (current?.key ?? 0) + 1 }));
    setDialog(guest ? { kind: "edit", guest } : { kind: "add" });
  };

  function makeClaim(guest: Guest) {
    start(async () => {
      const result = await createClaimCode({ guestId: guest.id });
      if (!result.ok) return void toast.error(errorMessage(result.error));
      setCopied(false);
      setDialog({ kind: "claim", guest, code: result.data.code });
    });
  }

  function remove(guest: Guest) {
    start(async () => {
      const result = await removeGuests([guest.id]);
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success("Guest deleted");
      close();
    });
  }

  async function copyClaimLink(code: string) {
    await navigator.clipboard.writeText(claimLink(code));
    setCopied(true);
  }

  return { dialog, setDialog, close, formTarget, openForm, copied, copyClaimLink, pending, makeClaim, remove };
}

export const claimLink = (code: string) => `${window.location.origin}/onboarding?claim=${code}`;
