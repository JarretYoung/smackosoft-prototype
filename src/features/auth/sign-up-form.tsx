"use client";

import { signUp } from "@/src/features/auth/actions";
import { AuthShell } from "@/src/features/auth/auth-shell";
import { GoogleButton } from "@/src/features/auth/google-button";
import { PasswordInput } from "@/src/features/auth/password-input";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { emailProblem, PASSWORD_RULE, passwordProblem } from "@/src/features/auth/auth-errors";
import { errorMessage, fieldErrors } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import Link from "next/link";
import { useState, useTransition } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [rejections, setRejections] = useState(0);
  const [serverError, setServerError] = useState<{ field: "email" | "password"; message: string } | null>(null);
  const [isLoading, start] = useTransition();
  useRevealFirstError(rejections);

  const show = (field: string) => left[field] || rejections > 0;
  const emailError =
    (show("email") ? emailProblem(email) : undefined) ?? (serverError?.field === "email" ? serverError.message : undefined);
  const passwordError =
    (show("password") ? passwordProblem(password) : undefined) ??
    (serverError?.field === "password" ? serverError.message : undefined);

  // A plain onSubmit, not a form action: React clears an action form after it runs.
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email) || passwordProblem(password)) return setRejections((n) => n + 1);
    setServerError(null);
    start(async () => {
      // On success the action redirects, so a result only ever comes back as a failure.
      const result = await signUp({ email, password });
      if (!result.ok) {
        const [field, message] = Object.entries(fieldErrors(result.error))[0] ?? ["password", errorMessage(result.error)];
        setServerError({ field: field === "email" ? "email" : "password", message });
        setRejections((n) => n + 1);
      }
    });
  };

  return (
    <AuthShell title="Create your account" description="It takes a minute. You pick a name and handle next.">
      <form onSubmit={handleSignUp} noValidate className="flex flex-col gap-6">
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
                setServerError(null);
              }}
              onBlur={() => setLeft((l) => ({ ...l, email: true }))}
            />
            <FieldError>{emailError}</FieldError>
          </Field>
          <Field data-invalid={!!passwordError}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              enterKeyHint="go"
              aria-invalid={!!passwordError}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setServerError(null);
              }}
              onBlur={() => setLeft((l) => ({ ...l, password: true }))}
            />
            {passwordError ? (
              <FieldError>{passwordError}</FieldError>
            ) : (
              <FieldDescription>{PASSWORD_RULE}</FieldDescription>
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Creating account" : "Sign up"}
        </Button>
        <GoogleButton />
        <p className="text-center text-subhead text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
