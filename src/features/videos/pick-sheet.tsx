"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Thumb } from "./video-rows";

export type PickItem = { key: string; label: string; detail?: string; thumbnailUrl?: string | null };

/** A bottom sheet with one list to choose from. Used to pick a game for a video, or a video for a game. */
export function PickSheet({
  open,
  title,
  description,
  items,
  withThumbs = false,
  empty,
  action,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  items: PickItem[];
  withThumbs?: boolean;
  /** Shown instead of the list when there is nothing to pick. */
  empty: ReactNode;
  /** Always shown under the list, for adding something new instead. */
  action?: ReactNode;
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto">
        <SheetHeader className="px-5 pt-2 pb-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-5 pb-6">
          {items.length === 0 ? (
            empty
          ) : (
            <ul className="group-list border border-border/60 shadow-none">
              {items.map((item) => (
                <li key={item.key}>
                  <button type="button" onClick={() => onPick(item.key)} className="pressable-row list-row w-full text-left">
                    {withThumbs && <Thumb url={item.thumbnailUrl ?? null} />}
                    <p className="min-w-0 flex-1 truncate text-body font-semibold tracking-tight">{item.label}</p>
                    {item.detail && <span className="shrink-0 text-sm text-muted-foreground">{item.detail}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {action}
        </div>
      </SheetContent>
    </Sheet>
  );
}
