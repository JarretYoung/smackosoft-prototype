"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useStore, type AnyFieldApi } from "@tanstack/react-form";
import { handleProblem } from "@/src/components/handle-hint";
import { saveCurrentAccount } from "@/src/features/accounts/actions";
import { useAppForm } from "@/src/hooks/use-app-form";
import { normalizeHandle, useHandleCheck } from "@/src/hooks/use-handle-check";
import { accountSchema } from "@/src/lib/account-schema";
import { errorMessage } from "@/src/lib/errors";

/**
 * Edit your name and handle. A handle can change a few times in total, so the hook checks the new
 * one as it is typed, and holds the save until the person confirms spending a change.
 */
export function useProfileForm({ displayName, handle }: { displayName: string; handle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const confirmed = useRef(false);

  const app = useAppForm({
    defaultValues: { displayName, handle },
    schema: accountSchema,
    ready: (): boolean => !handleChanged || check.status === "free",
    unsaved: (values, saved) =>
      values.displayName.trim() !== saved.displayName || normalizeHandle(values.handle) !== normalizeHandle(saved.handle),
    submit: (values) => {
      if (normalizeHandle(values.handle) !== handle && !confirmed.current) return void setConfirming(true);
      confirmed.current = false;
      return saveCurrentAccount({ displayName: values.displayName, handle: normalizeHandle(values.handle) });
    },
    onSuccess: (_data, { values, reset }) => {
      reset({ displayName: values.displayName.trim(), handle: normalizeHandle(values.handle) });
      toast.success("Profile saved");
      router.refresh();
    },
    unmatched: (error) => toast.error(errorMessage(error)),
  });

  const handleText = useStore(app.form.store, (state) => state.values.handle);
  const wanted = normalizeHandle(handleText);
  const check = useHandleCheck(handleText, handle);
  const handleChanged = wanted !== handle;

  const handleError = (field: AnyFieldApi) =>
    app.errorOf(field) ?? handleProblem(check, field.state.meta.isBlurred || app.attempted) ?? undefined;

  /** The person agreed to spend a handle change. */
  const confirmHandleChange = () => {
    confirmed.current = true;
    setConfirming(false);
    void app.form.handleSubmit();
  };

  return { ...app, wanted, check, handleError, confirming, setConfirming, confirmHandleChange };
}
