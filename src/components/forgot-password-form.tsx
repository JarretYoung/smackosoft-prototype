"use client";

import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth-shell";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { authMessage, emailProblem } from "@/src/lib/auth-errors";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useRevealFirstError(rejections);

  const emailError = (left || rejections > 0 ? emailProblem(email) : undefined) ?? error ?? undefined;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email)) return setRejections((n) => n + 1);
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(authMessage(error));
      setRejections((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell title="Check your email" description="Password reset instructions sent.">
        <p className="text-[0.9375rem] text-muted-foreground">
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
        <p className="text-center text-[0.9375rem] text-muted-foreground">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
