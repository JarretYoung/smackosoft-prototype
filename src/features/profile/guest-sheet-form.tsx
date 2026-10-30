"use client";

import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import type { Guest } from "@/src/contract";
import { useGuestForm } from "@/src/features/profile/use-guest-form";

/** The body of the add guest and edit guest sheets. Mount it fresh for each opening. */
export function GuestSheetForm({ guest, onClose }: { guest?: Guest; onClose: () => void }) {
  const { form, formProps, errorOf, inputProps, pending, canSave } = useGuestForm({ guest, onDone: onClose });

  return (
    <form {...formProps} className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>{guest ? "Edit guest" : "Add a guest"}</SheetTitle>
        <SheetDescription>
          {guest ? "A handle can change a few times in total, so pick it with care." : "A guest can play in your sessions without signing up."}
        </SheetDescription>
      </SheetHeader>
      <FieldGroup className="px-5">
        <form.Field name="displayName">
          {(field) => (
            <Field data-invalid={!!errorOf(field)}>
              <FieldLabel htmlFor="guest-name">Display name</FieldLabel>
              <Input
                {...inputProps(field)}
                id="guest-name"
                autoFocus={!guest}
                autoComplete="off"
                enterKeyHint={guest ? "next" : "done"}
                placeholder={guest ? undefined : "Aadit"}
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
        {guest && (
          <form.Field name="handle">
            {(field) => (
              <Field data-invalid={!!errorOf(field)}>
                <FieldLabel htmlFor="guest-handle">Handle</FieldLabel>
                <Input
                  {...inputProps(field)}
                  id="guest-handle"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  enterKeyHint="done"
                />
                <FieldError>{errorOf(field)}</FieldError>
              </Field>
            )}
          </form.Field>
        )}
      </FieldGroup>
      <SheetFooter className="px-5 pb-6">
        <Button type="submit" size="lg" disabled={pending || !canSave}>
          {pending && <Spinner />}
          {guest ? "Save changes" : "Add guest"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
