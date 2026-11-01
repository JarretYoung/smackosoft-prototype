"use client";

import { ImagePlus, Pencil } from "lucide-react";
import { useState } from "react";
import { SessionCover } from "@/src/components/court-art";
import { Button } from "@/src/components/ui/button";
import { FieldError } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { cn } from "@/src/lib/utils";

const looksLikeLink = (value: string) => /^https?:\/\/\S+$/.test(value.trim());

/**
 * The session cover as a tile at the top of the form, the way it shows on the session page.
 * Tap it to paste an image link in a sheet. An empty cover shows the drawn court, as it will on the session.
 */
export function CoverTile({
  url,
  onChange,
  onBlur,
  error,
}: {
  url: string;
  onChange: (url: string) => void;
  /** The link field lost focus, so its error may show. */
  onBlur: () => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  // The link that failed to load, so the preview falls back to the drawn court until the link changes.
  const [broken, setBroken] = useState("");
  const link = url.trim();
  const shown = looksLikeLink(link) && !error && broken !== link ? link : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={link ? "Change cover image" : "Add cover image"}
        className={cn(
          "pressable relative block h-40 w-full overflow-hidden rounded-2xl text-left shadow-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          error && "ring-[3px] ring-destructive/40",
        )}
      >
        <SessionCover url={shown} className="absolute inset-0" />
        <span className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-card/90 px-3.5 text-sm font-semibold shadow-card backdrop-blur">
          {link ? <Pencil className="size-4" /> : <ImagePlus className="size-4" />}
          {link ? "Change cover" : "Add cover"}
        </span>
      </button>
      {/* Preload to catch a link that is not an image, since SessionCover has no error hook. */}
      {shown && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" onError={() => setBroken(shown)} className="hidden" />
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader className="pb-0">
            <SheetTitle>Cover image</SheetTitle>
            <SheetDescription>Paste a link to a photo. Without one, the session shows a drawn court.</SheetDescription>
          </SheetHeader>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              // A link that cannot work stays open, with its error showing.
              if (link !== "" && !looksLikeLink(link)) return onBlur();
              setOpen(false);
            }}
            className="flex flex-col gap-4 px-5 pb-6"
          >
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                aria-label="Image link"
                placeholder="https://"
                value={url}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                aria-invalid={!!error}
              />
              <FieldError>{error}</FieldError>
            </div>
            <Button type="submit" size="lg">
              Done
            </Button>
            {link && (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Remove cover
              </Button>
            )}
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
