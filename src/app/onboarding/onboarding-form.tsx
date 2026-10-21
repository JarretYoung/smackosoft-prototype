"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SaveCurrentAccountInput } from "@/src/contract";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { fieldErrors } from "@/src/lib/errors";
import { saveCurrentAccount } from "../actions";

export function OnboardingForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

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
  );
}
