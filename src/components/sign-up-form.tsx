"use client";

import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth-shell";
import { PasswordInput } from "@/src/components/password-input";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { authMessage, emailProblem, MIN_PASSWORD } from "@/src/lib/auth-errors";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [rejections, setRejections] = useState(0);
  const [serverError, setServerError] = useState<{ field: "email" | "password"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  useRevealFirstError(rejections);

  const show = (field: string) => left[field] || rejections > 0;
  const emailError =
    (show("email") ? emailProblem(email) : undefined) ?? (serverError?.field === "email" ? serverError.message : undefined);
  const passwordError =
    (show("password") && password.length < MIN_PASSWORD ? `Use at least ${MIN_PASSWORD} characters` : undefined) ??
    (serverError?.field === "password" ? serverError.message : undefined);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email) || password.length < MIN_PASSWORD) return setRejections((n) => n + 1);
    const supabase = createClient();
    setIsLoading(true);
    setServerError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      const message = authMessage(error);
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      setServerError({ field: /exists|email/.test(code) ? "email" : "password", message });
      setRejections((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
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
              <FieldDescription>At least {MIN_PASSWORD} characters.</FieldDescription>
            )}
          </Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading && <Spinner />}
          {isLoading ? "Creating account" : "Sign up"}
        </Button>
        <p className="text-center text-[0.9375rem] text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
