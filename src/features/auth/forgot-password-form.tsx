"use client";

import { AuthShell } from "@/src/features/auth/auth-shell";
import { useForgotPasswordForm } from "@/src/features/auth/use-forgot-password-form";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import Link from "next/link";

export function ForgotPasswordForm() {
  const { form, formProps, errorOf, inputProps, pending, sent } = useForgotPasswordForm();

  if (sent) {
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
                  enterKeyHint="send"
                />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Sending" : "Send reset email"}
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
