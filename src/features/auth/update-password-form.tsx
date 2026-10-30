"use client";

import { AuthShell } from "@/src/features/auth/auth-shell";
import { PasswordInput } from "@/src/features/auth/password-input";
import { useUpdatePasswordForm } from "@/src/features/auth/use-update-password-form";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Spinner } from "@/src/components/ui/spinner";

export function UpdatePasswordForm() {
  const { form, formProps, errorOf, inputProps, pending } = useUpdatePasswordForm();

  return (
    <AuthShell title="Choose a new password" description="Enter your new password below.">
      <form {...formProps} className="flex flex-col gap-6">
        <FieldGroup>
          <form.Field name="password">
            {(field) => (
              <Field data-invalid={!!errorOf(field)}>
                <FieldLabel htmlFor="password">New password</FieldLabel>
                <PasswordInput {...inputProps(field)} id="password" autoComplete="new-password" enterKeyHint="go" />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
        </FieldGroup>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Saving" : "Save new password"}
        </Button>
      </form>
    </AuthShell>
  );
}
