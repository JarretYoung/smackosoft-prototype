"use client";

import { PersonAvatar } from "@/src/components/avatar-stack";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import type { Account } from "@/src/contract";

/**
 * Pick who plays for one team. Only members of the session can be picked.
 * Someone on the other team is shown but cannot be taken, because a player is on one team per match.
 */
export function TeamPlayersSheet({
  open,
  onOpenChange,
  teamLabel,
  candidates,
  selected,
  takenElsewhere,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamLabel: string;
  candidates: Account[];
  selected: Set<string>;
  takenElsewhere: Set<string>;
  onChange: (ids: Set<string>) => void;
}) {
  function toggle(id: string, on: boolean) {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    onChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader className="px-5 pt-2 pb-0">
          <SheetTitle>{teamLabel} players</SheetTitle>
          <SheetDescription>Choose from the session members.</SheetDescription>
        </SheetHeader>
        <ul className="group-list mx-5 border border-border/60 shadow-none">
          {candidates.map((account) => {
            const blocked = takenElsewhere.has(account.id);
            return (
              <li key={account.id}>
                <label
                  className="pressable-row flex min-h-14 items-center gap-3 px-4 py-2 aria-disabled:opacity-50"
                  aria-disabled={blocked}
                >
                  <PersonAvatar person={account} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{account.displayName}</span>
                    <span className="block text-sm text-muted-foreground">
                      {blocked ? "On the other team" : account.isGuest ? "Guest" : `@${account.handle}`}
                    </span>
                  </span>
                  <Checkbox
                    checked={selected.has(account.id)}
                    disabled={blocked}
                    onCheckedChange={(v) => toggle(account.id, v === true)}
                    className="size-6 rounded-full"
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <SheetFooter className="px-5 pb-6">
          <Button type="button" size="lg" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
