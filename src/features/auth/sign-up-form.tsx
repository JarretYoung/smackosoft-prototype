"use client";

import { AuthShell } from "@/src/features/auth/auth-shell";
import { GoogleButton } from "@/src/features/auth/google-button";
import { PasswordInput } from "@/src/features/auth/password-input";
import { useSignUpForm } from "@/src/features/auth/use-sign-up-form";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { PASSWORD_RULE } from "@/src/features/auth/auth-errors";
import Link from "next/link";

export function SignUpForm() {
  const { form, formProps, errorOf, inputProps, pending } = useSignUpForm();

  return (
    <AuthShell title="Create your account" description="It takes a minute. You pick a name and handle next.">
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
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput {...inputProps(field)} id="password" autoComplete="new-password" enterKeyHint="go" />
                {errorOf(field) ? <FieldError>{errorOf(field)}</FieldError> : <FieldDescription>{PASSWORD_RULE}</FieldDescription>}
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Creating account" : "Sign up"}
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
