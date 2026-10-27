"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SaveCurrentAccountInput } from "@/src/contract";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Separator } from "@/src/components/ui/separator";
import { Spinner } from "@/src/components/ui/spinner";
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
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={!!errors.displayName}>
            <FieldLabel htmlFor="displayName">Display name</FieldLabel>
            <Input
              id="displayName"
              name="displayName"
              placeholder="Your name"
              autoComplete="name"
              aria-invalid={!!errors.displayName}
            />
            <FieldError>{errors.displayName}</FieldError>
          </Field>
          <Field data-invalid={!!errors.handle}>
            <FieldLabel htmlFor="handle">Handle</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-muted-foreground">@</span>
              <Input
                id="handle"
                name="handle"
                placeholder="yourhandle"
                autoCapitalize="none"
                autoComplete="username"
                aria-invalid={!!errors.handle}
              />
            </div>
            <FieldDescription>3 to 30 characters: a to z, 0 to 9 and underscore.</FieldDescription>
            <FieldError>{errors.handle}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Saving" : "Continue"}
        </Button>
      </form>

      <Separator />

      {claiming ? (
        <form onSubmit={claim} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!claimError}>
              <FieldLabel htmlFor="claim">Claim code</FieldLabel>
              <Input
                id="claim"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from the person who added you"
                aria-invalid={!!claimError}
              />
              <FieldDescription>
                If someone added you as a guest, their code makes that guest your account, with its match history.
              </FieldDescription>
              <FieldError>{claimError}</FieldError>
            </Field>
          </FieldGroup>
          <Button type="submit" variant="secondary" size="lg" disabled={pending || code.trim().length < 8}>
            {pending && <Spinner />}
            {pending ? "Claiming" : "Claim my guest account"}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="link" onClick={() => setClaiming(true)} className="self-center">
          I have a claim code
        </Button>
      )}
    </div>
  );
}
