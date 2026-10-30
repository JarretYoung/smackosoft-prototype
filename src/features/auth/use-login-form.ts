"use client";

import { signIn } from "@/src/features/auth/actions";
import { loginSchema } from "@/src/features/auth/auth-schemas";
import { useAppForm } from "@/src/hooks/use-app-form";

/** On success the action redirects, so a result only ever comes back as a failure. Every failure shows under the password. */
export function useLoginForm() {
  return useAppForm({
    defaultValues: { email: "", password: "" },
    schema: loginSchema,
    submit: signIn,
    serverFields: ["password"],
    unmatched: "password",
  });
}
