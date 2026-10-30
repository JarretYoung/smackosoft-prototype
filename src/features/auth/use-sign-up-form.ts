"use client";

import { signUp } from "@/src/features/auth/actions";
import { signUpSchema } from "@/src/features/auth/auth-schemas";
import { useAppForm } from "@/src/hooks/use-app-form";

/** On success the action redirects, so a result only ever comes back as a failure. */
export function useSignUpForm() {
  return useAppForm({
    defaultValues: { email: "", password: "" },
    schema: signUpSchema,
    submit: signUp,
    unmatched: "password",
  });
}
