"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import { formatOffset, OFFSET_LIMIT, parseOffset } from "@/src/features/videos/offset";
import { OffsetRuler } from "./offset-ruler";

export type SyncTarget = {
  videoId: string;
  label: string;
  matchGameId: string;
  gameLabel: string;
  /** The saved sync point, or null when the video is not synced yet. */
  offset: number | null;
};

/**
 * Set where a game's shared moment (the first hit, a clap) sits in one video.
 * Slide the ruler or type the time. There is no preview yet, so the number is the source of truth.
 */
export function SyncSheet({
  target,
  pending,
  onClose,
  onSave,
}: {
  target: SyncTarget | null;
  pending: boolean;
  onClose: () => void;
  /** Null clears the sync point. */
  onSave: (target: SyncTarget, offset: number | null) => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="overflow-y-auto">
        {target && <SyncForm key={`${target.videoId}:${target.matchGameId}`} target={target} pending={pending} onClose={onClose} onSave={onSave} />}
      </SheetContent>
    </Sheet>
  );
}

function SyncForm({
  target,
  pending,
  onClose,
  onSave,
}: {
  target: SyncTarget;
  pending: boolean;
  onClose: () => void;
  onSave: (target: SyncTarget, offset: number | null) => void;
}) {
  const [value, setValue] = useState(target.offset ?? 0);
  const [draft, setDraft] = useState(formatOffset(target.offset ?? 0));
  const typed = parseOffset(draft);
  const invalid = typed === null;
  const synced = target.offset !== null;

  const set = (seconds: number) => {
    const next = Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, seconds));
    setValue(next);
    setDraft(formatOffset(next));
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending && !invalid) onSave(target, value);
      }}
    >
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>Sync video</SheetTitle>
        <SheetDescription>
          {target.label} · {target.gameLabel}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-5">
        <Field>
          <FieldLabel htmlFor="sync-offset" className="sr-only">
            Sync point
          </FieldLabel>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="icon" aria-label="One second earlier" onClick={() => set(value - 1)}>
              <Minus />
            </Button>
            <Input
              id="sync-offset"
              value={draft}
              inputMode="text"
              enterKeyHint="done"
              autoComplete="off"
              aria-invalid={invalid}
              onChange={(e) => {
                setDraft(e.target.value);
                const parsed = parseOffset(e.target.value);
                if (parsed !== null) setValue(parsed);
              }}
              onBlur={() => setDraft(formatOffset(value))}
              className="h-14 flex-1 text-center text-3xl font-bold tracking-tight tabular-nums"
            />
            <Button type="button" variant="secondary" size="icon" aria-label="One second later" onClick={() => set(value + 1)}>
              <Plus />
            </Button>
          </div>
          <OffsetRuler value={value} onChange={set} />
          <FieldDescription className="text-center">Line up a moment every video shares, like the first serve</FieldDescription>
        </Field>
      </div>

      <SheetFooter className="px-5 pb-6">
        <Button type="submit" size="lg" disabled={pending || invalid}>
          {pending && <Spinner />}
          {pending ? "Saving" : "Save"}
        </Button>
        <div className="flex justify-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {synced ? "Cancel" : "Not now"}
          </Button>
          {synced && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() => onSave(target, null)}
            >
              Clear
            </Button>
          )}
        </div>
      </SheetFooter>
    </form>
  );
}
