"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SaveCurrentAccountInput } from "@/src/contract";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { fieldErrors } from "@/src/lib/errors";
import { claimGuest, saveCurrentAccount } from "../actions";

export function OnboardingForm({ claimCode }: { claimCode: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [claiming, setClaiming] = useState(claimCode !== "");
  const [code, setCode] = useState(claimCode);
  const [claimError, setClaimError] = useState<string | null>(null);

  function claim(event: React.FormEvent) {
    event.preventDefault();
    setClaimError(null);
    start(async () => {
      const result = await claimGuest({ token: code });
      if (result.ok) router.replace("/home");
      else setClaimError(fieldErrors(result.error).token ?? "That code did not work.");
    });
  }

  // A plain onSubmit, not a form action: React clears an action form after it runs,
  // which would wipe what the user typed when the server says the handle is taken.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const input = {
      displayName: String(formData.get("displayName") ?? ""),
      handle: String(formData.get("handle") ?? "").trim().toLowerCase(),
    };
    const checked = SaveCurrentAccountInput.safeParse(input);
    if (!checked.success) {
      setErrors(Object.fromEntries(checked.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    start(async () => {
      const result = await saveCurrentAccount(input);
      if (result.ok) router.replace("/home");
      else setErrors(fieldErrors(result.error));
    });
  }

  return (
    <div className="space-y-6">
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" placeholder="Your name" autoComplete="name" />
        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">@</span>
          <Input id="handle" name="handle" placeholder="yourhandle" autoCapitalize="none" autoComplete="username" />
        </div>
        <p className="text-xs text-muted-foreground">3 to 30 characters: a to z, 0 to 9 and underscore.</p>
        {errors.handle && <p className="text-sm text-destructive">{errors.handle}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving" : "Continue"}
      </Button>
    </form>

      <div className="border-t pt-5">
        {claiming ? (
          <form onSubmit={claim} className="space-y-3">
            <Label htmlFor="claim">Claim code</Label>
            <Input id="claim" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code from the person who added you" />
            <p className="text-xs text-muted-foreground">
              If someone added you as a guest, their code makes that guest your account, with its match history.
            </p>
            {claimError && <p className="text-sm text-destructive">{claimError}</p>}
            <Button type="submit" variant="secondary" className="w-full" disabled={pending || code.trim().length < 8}>
              {pending ? "Claiming" : "Claim my guest account"}
            </Button>
          </form>
        ) : (
          <button type="button" onClick={() => setClaiming(true)} className="text-sm font-medium text-primary">
            I have a claim code
          </button>
        )}
      </div>
    </div>
  );
}
