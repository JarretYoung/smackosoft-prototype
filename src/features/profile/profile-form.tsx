"use client";

import { HandleHint } from "@/src/components/handle-hint";
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
import { useProfileForm } from "@/src/features/profile/use-profile-form";

export function ProfileForm({
  displayName,
  handle,
  changesLeft,
}: {
  displayName: string;
  handle: string;
  changesLeft: number;
}) {
  const { form, formProps, errorOf, inputProps, handleError, check, wanted, pending, dirty, confirming, setConfirming, confirmHandleChange } =
    useProfileForm({ displayName, handle });

  return (
    <form {...formProps} className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>
          <form.Field name="displayName">
            {(field) => (
              <Field data-invalid={!!errorOf(field)}>
                <FieldLabel htmlFor="name">Display name</FieldLabel>
                <Input {...inputProps(field)} id="name" autoComplete="name" enterKeyHint="next" />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
          <form.Field name="handle">
            {(field) => {
              const error = handleError(field);
              return (
                <Field data-invalid={!!error} data-disabled={changesLeft === 0}>
                  <FieldLabel htmlFor="handle">Handle</FieldLabel>
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-lg font-semibold text-muted-foreground">
                      @
                    </span>
                    <Input
                      {...inputProps(field)}
                      aria-invalid={!!error}
                      id="handle"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      disabled={changesLeft === 0}
                    />
                  </div>
                  {error ? <FieldError>{error}</FieldError> : <HandleHint check={check} handle={wanted} />}
                  <FieldDescription>
                    {changesLeft === 0
                      ? "You have used all your handle changes."
                      : `You can change your handle ${changesLeft} more ${changesLeft === 1 ? "time" : "times"}.`}
                  </FieldDescription>
                </Field>
              );
            }}
          </form.Field>
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
            <AlertDialogAction onClick={confirmHandleChange}>Change handle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
