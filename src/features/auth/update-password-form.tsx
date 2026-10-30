"use client";

import { updatePassword } from "@/src/features/auth/actions";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { PasswordInput } from "@/src/features/auth/password-input";
import { Spinner } from "@/src/components/ui/spinner";
import { passwordProblem } from "@/src/features/auth/auth-errors";
import { errorMessage } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import { useState, useTransition } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [isLoading, start] = useTransition();
  useRevealFirstError(rejections);

  const problem = passwordProblem(password);
  const passwordError = (left || rejections > 0 ? problem : undefined) ?? error ?? undefined;

  // A plain onSubmit, not a form action: React clears an action form after it runs.
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (problem) return setRejections((n) => n + 1);
    setError(null);
    start(async () => {
      // On success the action redirects, so a result only ever comes back as a failure.
      const result = await updatePassword({ password });
      if (!result.ok) {
        setError(errorMessage(result.error));
        setRejections((n) => n + 1);
      }
    });
  };

  return (
    <AuthShell title="Choose a new password" description="Enter your new password below.">
      <form onSubmit={handleUpdatePassword} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={!!passwordError}>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              enterKeyHint="go"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onBlur={() => setLeft(true)}
              aria-invalid={!!passwordError}
            />
            <FieldError>{passwordError}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Saving" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
