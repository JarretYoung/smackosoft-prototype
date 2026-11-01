"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/src/features/auth/actions";
import { forgotPasswordSchema } from "@/src/features/auth/auth-schemas";
import { useAppForm } from "@/src/hooks/use-app-form";

export function useForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const app = useAppForm({
    defaultValues: { email: "" },
    schema: forgotPasswordSchema,
    submit: requestPasswordReset,
    onSuccess: () => setSent(true),
    unmatched: "email",
  });
  return { ...app, sent };
}
