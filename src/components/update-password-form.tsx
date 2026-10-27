"use client";

import { createClient } from "@/src/lib/supabase/client";
import { AuthShell } from "@/src/components/auth-shell";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { PasswordInput } from "@/src/components/password-input";
import { Spinner } from "@/src/components/ui/spinner";
import { authMessage, MIN_PASSWORD } from "@/src/lib/auth-errors";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  useRevealFirstError(rejections);

  const tooShort = password.length < MIN_PASSWORD;
  const passwordError = (left || rejections > 0 ? (tooShort ? `Use at least ${MIN_PASSWORD} characters` : undefined) : undefined) ?? error ?? undefined;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tooShort) return setRejections((n) => n + 1);
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push("/");
    } catch (error: unknown) {
      setError(authMessage(error));
      setRejections((n) => n + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" description="Enter your new password below.">
      <form onSubmit={handleForgotPassword} noValidate className="flex flex-col gap-6">
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
