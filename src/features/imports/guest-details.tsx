"use client";

import { useState } from "react";
import { HandleHint, handleProblem } from "@/src/components/handle-hint";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import type { Choice } from "@/src/features/imports/import-input";
import { normalizeHandle, useHandleCheck } from "@/src/hooks/use-handle-check";

type GuestChoice = Extract<Choice, { kind: "guest" }>;

/** A guest's name and handle, for the rare case the made up handle will not do. It checks the handle as it is typed. */
export function GuestDetails({ current, onUse }: { current: GuestChoice; onUse: (choice: GuestChoice) => void }) {
  const [displayName, setDisplayName] = useState(current.displayName);
  const [handle, setHandle] = useState(current.handle);
  const [left, setLeft] = useState(false);
  const check = useHandleCheck(handle, current.handle);
  const problem = handleProblem(check, left);
  const ready = displayName.trim() !== "" && (normalizeHandle(handle) === current.handle || check.status === "free");

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onUse({ kind: "guest", displayName: displayName.trim(), handle: normalizeHandle(handle) });
      }}
    >
      <Field>
        <FieldLabel htmlFor="import-guest-name">Display name</FieldLabel>
        <Input id="import-guest-name" value={displayName} autoComplete="off" onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <Field data-invalid={!!problem}>
        <FieldLabel htmlFor="import-guest-handle">Handle</FieldLabel>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg font-semibold text-muted-foreground">
            @
          </span>
          <Input
            id="import-guest-handle"
            value={handle}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={!!problem}
            onChange={(e) => setHandle(e.target.value)}
            onBlur={() => setLeft(true)}
          />
        </div>
        <FieldError>{problem}</FieldError>
        <HandleHint check={check} handle={normalizeHandle(handle)} />
      </Field>
      <Button type="submit" variant="tinted" size="lg" disabled={!ready}>
        Use these details
      </Button>
    </form>
  );
}
