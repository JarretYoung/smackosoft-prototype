"use client";

import { OptionalTag } from "@/src/components/optional-tag";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import { useAddVideoForm, type NewVideo } from "@/src/features/videos/use-add-video-form";

/** Add a video to the session. It stays unassigned until someone puts it in a game. */
export function AddVideoSheet({
  open,
  pending,
  onClose,
  onAdd,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onAdd: (video: NewVideo) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="overflow-y-auto">
        {open && <AddVideoForm pending={pending} onClose={onClose} onAdd={onAdd} />}
      </SheetContent>
    </Sheet>
  );
}

function AddVideoForm({
  pending,
  onClose,
  onAdd,
}: {
  pending: boolean;
  onClose: () => void;
  onAdd: (video: NewVideo) => void;
}) {
  const { form, formProps, errorOf, inputProps } = useAddVideoForm({ pending, onAdd });

  return (
    <form {...formProps} className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Add video</SheetTitle>
        <SheetDescription>Paste a link to a recording of the session.</SheetDescription>
      </SheetHeader>
      <FieldGroup className="px-5">
        <form.Field name="label">
          {(field) => (
            <Field data-invalid={!!errorOf(field)}>
              <FieldLabel htmlFor="video-label">Name</FieldLabel>
              <Input
                {...inputProps(field)}
                id="video-label"
                autoFocus
                autoComplete="off"
                enterKeyHint="next"
                placeholder="Court 3 recording"
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
        <form.Field name="videoUrl">
          {(field) => (
            <Field data-invalid={!!errorOf(field)}>
              <FieldLabel htmlFor="video-url">Video link</FieldLabel>
              <Input
                {...inputProps(field)}
                id="video-url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                placeholder="https://"
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
        <form.Field name="thumbnailUrl">
          {(field) => (
            <Field data-invalid={!!errorOf(field)}>
              <FieldLabel htmlFor="video-thumb">
                Preview image link <OptionalTag />
              </FieldLabel>
              <Input
                {...inputProps(field)}
                id="video-thumb"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://"
              />
              <FieldError>{errorOf(field)}</FieldError>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
      <SheetFooter className="px-5 pb-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Adding" : "Add video"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
