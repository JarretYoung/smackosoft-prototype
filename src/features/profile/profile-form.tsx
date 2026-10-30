"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCurrentAccount } from "@/src/features/accounts/actions";
import { HandleHint, handleProblem } from "@/src/components/handle-hint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Spinner } from "@/src/components/ui/spinner";
import { errorMessage, fieldErrors } from "@/src/lib/errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import { useUnsavedChanges } from "@/src/hooks/unsaved-changes";
import { normalizeHandle, useHandleCheck } from "@/src/hooks/use-handle-check";

/**
 * Edit your name and handle. A handle can change a few times in total, so the form says how many
 * are left, checks the new one as you type, and asks before spending a change.
 */
export function ProfileForm({
  displayName,
  handle,
  changesLeft,
}: {
  displayName: string;
  handle: string;
  changesLeft: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [nextHandle, setNextHandle] = useState(handle);
  const [left, setLeft] = useState<Record<string, boolean>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [rejections, setRejections] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const wanted = normalizeHandle(nextHandle);
  const check = useHandleCheck(nextHandle, handle);
  const handleChanged = wanted !== handle;
  const dirty = name.trim() !== displayName || handleChanged;
  useUnsavedChanges(dirty && !pending);
  useRevealFirstError(rejections);

  const nameError = (left.name || rejections > 0) && !name.trim() ? "Enter your name" : undefined;
  const handleError = serverErrors.handle ?? handleProblem(check, !!left.handle || rejections > 0);
  const handleOk = !handleChanged || check.status === "free";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !handleOk) return setRejections((n) => n + 1);
    if (handleChanged) return setConfirming(true);
    save();
  }

  function save() {
    setServerErrors({});
    start(async () => {
      const result = await saveCurrentAccount({ displayName: name, handle: wanted });
      if (!result.ok) {
        const inline = fieldErrors(result.error);
        setServerErrors(inline);
        if (Object.keys(inline).length) setRejections((n) => n + 1);
        else toast.error(errorMessage(result.error));
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>
          <Field data-invalid={!!nameError}>
            <FieldLabel htmlFor="name">Display name</FieldLabel>
            <Input
              id="name"
              value={name}
              autoComplete="name"
              enterKeyHint="next"
              aria-invalid={!!nameError}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setLeft((l) => ({ ...l, name: true }))}
            />
            <FieldError>{nameError}</FieldError>
          </Field>
          <Field data-invalid={!!handleError} data-disabled={changesLeft === 0}>
            <FieldLabel htmlFor="handle">Handle</FieldLabel>
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-lg font-semibold text-muted-foreground">
                @
              </span>
              <Input
                id="handle"
                value={nextHandle}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                disabled={changesLeft === 0}
                aria-invalid={!!handleError}
                onChange={(e) => {
                  setNextHandle(e.target.value);
                  setServerErrors({});
                }}
                onBlur={() => setLeft((l) => ({ ...l, handle: true }))}
              />
            </div>
            {handleError ? <FieldError>{handleError}</FieldError> : <HandleHint check={check} handle={wanted} />}
            <FieldDescription>
              {changesLeft === 0
                ? "You have used all your handle changes."
                : `You can change your handle ${changesLeft} more ${changesLeft === 1 ? "time" : "times"}.`}
            </FieldDescription>
          </Field>
        </FieldGroup>
      </div>
      <Button type="submit" size="lg" disabled={pending || !dirty || check.status === "checking"}>
        {pending && <Spinner />}
        {pending ? "Saving" : "Save changes"}
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your handle to @{wanted}?</AlertDialogTitle>
            <AlertDialogDescription>
              This uses one of your {changesLeft} remaining handle {changesLeft === 1 ? "change" : "changes"}.
              {changesLeft === 1 ? " It will be the last." : ` You will have ${changesLeft - 1} left.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary">Keep @{handle}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false);
                save();
              }}
            >
              Change handle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
