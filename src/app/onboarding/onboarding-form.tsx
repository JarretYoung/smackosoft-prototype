"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { HandleHint, handleProblem } from "@/src/components/handle-hint";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Separator } from "@/src/components/ui/separator";
import { Spinner } from "@/src/components/ui/spinner";
import { fieldErrors } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import { normalizeHandle, useHandleCheck } from "@/src/lib/use-handle-check";
import { claimGuest, saveCurrentAccount } from "../actions";

/** A handle to start from, made from the name: "Aadit K." becomes "aadit_k". Empty when nothing usable is left. */
function suggestHandle(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return slug.length >= 3 ? slug : "";
}

export function OnboardingForm({ claimCode }: { claimCode: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [typedHandle, setTypedHandle] = useState<string | null>(null);
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [rejections, setRejections] = useState(0);
  const [claiming, setClaiming] = useState(claimCode !== "");
  const [code, setCode] = useState(claimCode);
  const [claimError, setClaimError] = useState<string | null>(null);

  // The handle follows the name until the person types their own.
  const handleText = typedHandle ?? suggestHandle(name);
  const handle = normalizeHandle(handleText);
  const check = useHandleCheck(handleText);
  useRevealFirstError(rejections);

  const nameError = (left.name || rejections > 0) && !name.trim() ? "Enter your name" : undefined;
  const handleError =
    serverErrors.handle ??
    handleProblem(check, !!left.handle || rejections > 0) ??
    (rejections > 0 && !handle ? "Choose a handle" : undefined);

  function claim(event: React.FormEvent) {
    event.preventDefault();
    setClaimError(null);
    start(async () => {
      const result = await claimGuest({ token: code });
      if (result.ok) router.replace("/home");
      else setClaimError(fieldErrors(result.error).token ?? "That code did not work. Check it and try again.");
    });
  }

  // A plain onSubmit, not a form action: React clears an action form after it runs,
  // which would wipe what the user typed when the server says the handle is taken.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || check.status !== "free") {
      setRejections((n) => n + 1);
      return;
    }
    setServerErrors({});
    start(async () => {
      const result = await saveCurrentAccount({ displayName: name, handle });
      if (result.ok) router.replace("/home");
      else {
        setServerErrors(fieldErrors(result.error));
        setRejections((n) => n + 1);
      }
    });
  }

  const claimForm = (
    <form onSubmit={claim} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!claimError}>
          <FieldLabel htmlFor="claim">Claim code</FieldLabel>
          <Input
            id="claim"
            value={code}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(e) => {
              setCode(e.target.value);
              setClaimError(null);
            }}
            placeholder="Code from the person who added you"
            aria-invalid={!!claimError}
          />
          <FieldDescription>
            If someone added you as a guest, their code makes that guest your account, with its match history.
          </FieldDescription>
          <FieldError>{claimError}</FieldError>
        </Field>
      </FieldGroup>
      <Button type="submit" variant={claimCode ? "default" : "secondary"} size="lg" disabled={pending || code.trim().length < 8}>
        {pending && <Spinner />}
        {pending ? "Claiming" : "Claim my guest account"}
      </Button>
    </form>
  );

  const profileForm = (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!nameError}>
          <FieldLabel htmlFor="displayName">Display name</FieldLabel>
          <Input
            id="displayName"
            name="displayName"
            value={name}
            placeholder="Your name"
            autoComplete="name"
            enterKeyHint="next"
            aria-invalid={!!nameError}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setLeft((l) => ({ ...l, name: true }))}
          />
          <FieldError>{nameError}</FieldError>
        </Field>
        <Field data-invalid={!!handleError}>
          <FieldLabel htmlFor="handle">Handle</FieldLabel>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg font-semibold text-muted-foreground">
              @
            </span>
            <Input
              id="handle"
              name="handle"
              value={handleText}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              enterKeyHint="go"
              aria-invalid={!!handleError}
              onChange={(e) => {
                setTypedHandle(e.target.value);
                setServerErrors({});
              }}
              onBlur={() => setLeft((l) => ({ ...l, handle: true }))}
            />
          </div>
          {handleError ? <FieldError>{handleError}</FieldError> : <HandleHint check={check} handle={handle} />}
          <FieldDescription>Friends find you by this. You can change it 2 more times later.</FieldDescription>
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Saving" : "Continue"}
      </Button>
    </form>
  );

  // Someone who arrives with a code came to claim a guest, so that comes first.
  if (claimCode) {
    return (
      <div className="flex flex-col gap-6">
        {claimForm}
        <Separator />
        <div className="flex flex-col gap-4">
          <p className="text-center text-[0.9375rem] text-muted-foreground">Or start a new account instead</p>
          {profileForm}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {profileForm}
      <Separator />
      {claiming ? (
        claimForm
      ) : (
        <Button type="button" variant="link" onClick={() => setClaiming(true)} className="self-center">
          I have a claim code
        </Button>
      )}
    </div>
  );
}
