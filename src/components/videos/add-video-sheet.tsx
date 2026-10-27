"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";

export type NewVideo = { label: string; videoUrl: string; thumbnailUrl: string | null };

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
        {open && <AddVideoForm pending={pending} onAdd={onAdd} />}
      </SheetContent>
    </Sheet>
  );
}

function AddVideoForm({ pending, onAdd }: { pending: boolean; onAdd: (video: NewVideo) => void }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  return (
    <>
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Add video</SheetTitle>
        <SheetDescription>Links only. Uploads come later.</SheetDescription>
      </SheetHeader>
      <FieldGroup className="px-5">
        <Field>
          <FieldLabel htmlFor="video-label">Name</FieldLabel>
          <Input id="video-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Court 3 recording" />
        </Field>
        <Field>
          <FieldLabel htmlFor="video-url">Link</FieldLabel>
          <Input id="video-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
        </Field>
        <Field>
          <FieldLabel htmlFor="video-thumb">Thumbnail</FieldLabel>
          <Input
            id="video-thumb"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="Optional"
            inputMode="url"
          />
        </Field>
      </FieldGroup>
      <SheetFooter className="px-5 pb-6">
        <Button
          size="lg"
          disabled={pending || !label.trim() || !url.trim()}
          onClick={() => onAdd({ label, videoUrl: url.trim(), thumbnailUrl: thumbnail.trim() === "" ? null : thumbnail.trim() })}
        >
          {pending && <Spinner />}
          {pending ? "Adding" : "Add video"}
        </Button>
      </SheetFooter>
    </>
  );
}
