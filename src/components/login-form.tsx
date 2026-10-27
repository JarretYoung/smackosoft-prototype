"use client";

import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth-shell";
import { PasswordInput } from "@/src/components/password-input";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { authMessage, emailProblem } from "@/src/lib/auth-errors";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [rejections, setRejections] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  useRevealFirstError(rejections);

  const show = (field: string) => left[field] || rejections > 0;
  const emailError = show("email") ? emailProblem(email) : undefined;
  const passwordError = show("password") && !password ? "Enter your password" : undefined;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailProblem(email) || !password) return setRejections((n) => n + 1);
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.push("/");
    } catch (error: unknown) {
      setError(authMessage(error));
      setRejections((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
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
        <p className="text-center text-[0.9375rem] text-muted-foreground">
          New here?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
