"use client";

import { signIn } from "@/src/features/auth/actions";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { GoogleButton } from "@/src/features/auth/google-button";
import { PasswordInput } from "@/src/features/auth/password-input";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { emailProblem } from "@/src/features/auth/auth-errors";
import { errorMessage } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import Link from "next/link";
import { useState, useTransition } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [rejections, setRejections] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, start] = useTransition();
  useRevealFirstError(rejections);

  const show = (field: string) => left[field] || rejections > 0;
  const emailError = show("email") ? emailProblem(email) : undefined;
  const passwordError = show("password") && !password ? "Enter your password" : undefined;

  // A plain onSubmit, not a form action: React clears an action form after it runs.
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email) || !password) return setRejections((n) => n + 1);
    setError(null);
    start(async () => {
      // On success the action redirects, so a result only ever comes back as a failure.
      const result = await signIn({ email, password });
      if (!result.ok) {
        setError(errorMessage(result.error));
        setRejections((n) => n + 1);
      }
    });
  };

  return (
    <AuthShell title="Welcome back" description="Log in to see your sessions.">
      <form onSubmit={handleLogin} noValidate className="flex flex-col gap-6">
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
              enterKeyHint="next"
              aria-invalid={!!emailError}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onBlur={() => setLeft((l) => ({ ...l, email: true }))}
            />
            <FieldError>{emailError}</FieldError>
          </Field>
          <Field data-invalid={!!passwordError || !!error}>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                href="/auth/forgot-password"
                className="ml-auto rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              enterKeyHint="go"
              value={password}
              aria-invalid={!!passwordError || !!error}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              onBlur={() => setLeft((l) => ({ ...l, password: true }))}
            />
            <FieldError>{passwordError ?? error}</FieldError>
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Logging in" : "Log in"}
        </Button>
        <GoogleButton />
        <p className="text-center text-subhead text-muted-foreground">
          New here?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
