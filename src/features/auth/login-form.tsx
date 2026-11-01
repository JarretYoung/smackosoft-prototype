"use client";

import { AuthShell } from "@/src/features/auth/auth-shell";
import { GoogleButton } from "@/src/features/auth/google-button";
import { PasswordInput } from "@/src/features/auth/password-input";
import { useLoginForm } from "@/src/features/auth/use-login-form";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import Link from "next/link";

export function LoginForm() {
  const { form, formProps, errorOf, inputProps, pending } = useLoginForm();

  return (
    <AuthShell title="Welcome back" description="Log in to see your sessions.">
      <form {...formProps} className="flex flex-col gap-6">
        <FieldGroup>
          <form.Field name="email">
            {(field) => (
              <Field data-invalid={!!errorOf(field)}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...inputProps(field)}
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <Field data-invalid={!!errorOf(field)}>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput {...inputProps(field)} id="password" autoComplete="current-password" enterKeyHint="go" />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Logging in" : "Log in"}
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
