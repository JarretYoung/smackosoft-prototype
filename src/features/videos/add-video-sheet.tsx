"use client";

import { useStore } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import { useSheetDiscard } from "@/src/hooks/unsaved-changes";
import { OptionalTag } from "@/src/components/optional-tag";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import { youtubeIdOf } from "@/src/features/videos/player";
import { useAddVideoForm, type NewVideo } from "@/src/features/videos/use-add-video-form";
import { DurationProbe } from "./duration-probe";

/** The value, but only once it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

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
  const discard = useSheetDiscard();

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && discard.guard(onClose)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          {open && (
            <AddVideoForm
              pending={pending}
              onCancel={() => discard.guard(onClose)}
              onDirtyChange={discard.setDirty}
              onAdd={onAdd}
            />
          )}
        </SheetContent>
      </Sheet>
      {discard.dialog}
    </>
  );
}

function AddVideoForm({
  pending,
  onCancel,
  onDirtyChange,
  onAdd,
}: {
  pending: boolean;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onAdd: (video: NewVideo) => void;
}) {
  // The length of a YouTube link is read while the person fills in the rest, so adding does not wait for it.
  const [known, setKnown] = useState<{ link: string; seconds: number } | null>(null);
  const { form, formProps, errorOf, inputProps, dirty } = useAddVideoForm({
    pending,
    onAdd: (video) => onAdd({ ...video, durationSeconds: known?.link === video.videoUrl ? known.seconds : null }),
  });
  useEffect(() => onDirtyChange(dirty && !pending), [dirty, pending, onDirtyChange]);

  const typed = useStore(form.store, (state) => state.values.videoUrl).trim();
  const link = useDebounced(typed, 500);

  return (
    <form {...formProps} className="flex min-h-0 flex-1 flex-col gap-4">
      {link && youtubeIdOf(link) && (
        <DurationProbe key={link} link={link} onDuration={(seconds) => setKnown({ link, seconds })} />
      )}
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
