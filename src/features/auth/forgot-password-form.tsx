"use client";

import { requestPasswordReset } from "@/src/features/auth/actions";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { emailProblem } from "@/src/features/auth/auth-errors";
import { errorMessage } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import Link from "next/link";
import { useState, useTransition } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isLoading, start] = useTransition();
  useRevealFirstError(rejections);

  const emailError = (left || rejections > 0 ? emailProblem(email) : undefined) ?? error ?? undefined;

  // A plain onSubmit, not a form action: React clears an action form after it runs.
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email)) return setRejections((n) => n + 1);
    setError(null);
    start(async () => {
      const result = await requestPasswordReset({ email });
      if (result.ok) setSuccess(true);
      else {
        setError(errorMessage(result.error));
        setRejections((n) => n + 1);
      }
    });
  };

  if (success) {
    return (
      <AuthShell title="Check your email" description="Password reset instructions sent.">
        <p className="text-subhead text-muted-foreground">
          If you registered using your email and password, you will receive a password reset email.
        </p>
        <Button asChild variant="secondary" size="lg">
          <Link href="/auth/login">Back to log in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" description="Type in your email and we will send you a link to reset it.">
      <form onSubmit={handleForgotPassword} noValidate className="flex flex-col gap-6">
        <FieldGroup>
          <Field data-invalid={!!emailError}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onBlur={() => setLeft(true)}
              aria-invalid={!!emailError}
            />
            <FieldError>{emailError}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Sending" : "Send reset email"}
        </Button>
        <p className="text-center text-subhead text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
