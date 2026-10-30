"use client";

import { useState } from "react";
import { OptionalTag } from "@/src/components/optional-tag";
import { Button } from "@/src/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";

export type NewVideo = { label: string; videoUrl: string; thumbnailUrl: string | null };

const BAD_LINK = "Paste a full link, starting with https://";

function isWebLink(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
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
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const issues: Record<string, string> = {};
  if (!label.trim()) issues.label = "Give the video a name";
  if (!url.trim()) issues.url = "Paste the link to the video";
  else if (!isWebLink(url.trim())) issues.url = BAD_LINK;
  if (thumbnail.trim() && !isWebLink(thumbnail.trim())) issues.thumbnail = BAD_LINK;
  const show = (field: string) => (submitted || touched[field] ? issues[field] : undefined);
  const touch = (field: string) => () => setTouched((t) => ({ ...t, [field]: true }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(issues).length || pending) return;
    onAdd({ label: label.trim(), videoUrl: url.trim(), thumbnailUrl: thumbnail.trim() === "" ? null : thumbnail.trim() });
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Add video</SheetTitle>
        <SheetDescription>Paste a link to a recording of the session.</SheetDescription>
      </SheetHeader>
      <FieldGroup className="px-5">
        <Field data-invalid={!!show("label")}>
          <FieldLabel htmlFor="video-label">Name</FieldLabel>
          <Input
            id="video-label"
            value={label}
            autoFocus
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={!!show("label")}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={touch("label")}
            placeholder="Court 3 recording"
          />
          <FieldError>{show("label")}</FieldError>
        </Field>
        <Field data-invalid={!!show("url")}>
          <FieldLabel htmlFor="video-url">Video link</FieldLabel>
          <Input
            id="video-url"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-invalid={!!show("url")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={touch("url")}
            placeholder="https://"
          />
          <FieldError>{show("url")}</FieldError>
        </Field>
        <Field data-invalid={!!show("thumbnail")}>
          <FieldLabel htmlFor="video-thumb">
            Preview image link <OptionalTag />
          </FieldLabel>
          <Input
            id="video-thumb"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!show("thumbnail")}
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            onBlur={touch("thumbnail")}
            placeholder="https://"
          />
          <FieldError>{show("thumbnail")}</FieldError>
        </Field>
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
