"use client";

import { updatePassword } from "@/src/features/auth/actions";
import { updatePasswordSchema } from "@/src/features/auth/auth-schemas";
import { useAppForm } from "@/src/hooks/use-app-form";

/** On success the action redirects, so a result only ever comes back as a failure. */
export function useUpdatePasswordForm() {
  return useAppForm({
    defaultValues: { password: "" },
    schema: updatePasswordSchema,
    submit: updatePassword,
    unmatched: "password",
  });
}
