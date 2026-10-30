"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useStore } from "@tanstack/react-form";
import { handleProblem } from "@/src/components/handle-hint";
import { claimGuest, saveCurrentAccount } from "@/src/features/accounts/actions";
import { useAppForm } from "@/src/hooks/use-app-form";
import { normalizeHandle, useHandleCheck } from "@/src/hooks/use-handle-check";
import { accountSchema } from "@/src/lib/account-schema";
import { errorMessage } from "@/src/lib/errors";
import { z } from "zod";

/** The name starts from Google when it has one. The handle is always the person's own choice. */
export function useOnboardingForm({ suggestedName, avatarUrl }: { suggestedName: string; avatarUrl: string | null }) {
  const router = useRouter();
  const app = useAppForm({
    defaultValues: { displayName: suggestedName, handle: "" },
    schema: accountSchema,
    ready: (): boolean => check.status === "free",
    submit: (values) =>
      saveCurrentAccount({ displayName: values.displayName, handle: normalizeHandle(values.handle), avatarUrl }),
    onSuccess: () => router.replace("/home"),
    unmatched: (error) => toast.error(errorMessage(error)),
  });

  const handleText = useStore(app.form.store, (state) => state.values.handle);
  const handle = normalizeHandle(handleText);
  const check = useHandleCheck(handleText);
  const handleError = (field: AnyFieldApi) =>
    app.errorOf(field) ?? handleProblem(check, field.state.meta.isBlurred || app.attempted) ?? undefined;

  return { ...app, handle, check, handleError };
}

/** Turn a guest the person was added as into their account. The button waits for a code long enough to be one. */
export function useClaimForm(claimCode: string) {
  const router = useRouter();
  const app = useAppForm({
    defaultValues: { code: claimCode },
    schema: z.object({ code: z.string() }),
    ready: (): boolean => canClaim,
    submit: (values) => claimGuest({ code: values.code }),
    onSuccess: () => router.replace("/home"),
    serverFields: ["code"],
    unmatched: "code",
  });
  const code = useStore(app.form.store, (state) => state.values.code);
  const canClaim = code.trim().length >= 8;
  return { ...app, canClaim };
}
