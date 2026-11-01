"use client";

import { useEffect } from "react";
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
import { useTeamPlayersForm } from "@/src/features/matches/use-team-players-form";
import { useSheetDiscard } from "@/src/hooks/unsaved-changes";

/**
 * Pick who plays for one team. Only members of the session can be picked.
 * Someone on the other team is shown but cannot be taken, because a player is on one team per match.
 * Nothing reaches the match until Done.
 */
export function TeamPlayersSheet({
  open,
  teamId,
  teamLabel,
  candidates,
  playerIds,
  takenElsewhere,
  onClose,
  onSave,
}: {
  open: boolean;
  teamId: string;
  teamLabel: string;
  candidates: Account[];
  playerIds: string[];
  takenElsewhere: Set<string>;
  onClose: () => void;
  onSave: (playerIds: string[]) => void;
}) {
  const discard = useSheetDiscard();

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && discard.guard(onClose)}>
        <SheetContent side="bottom" className="overflow-y-auto">
          {open && (
            <TeamPlayersForm
              key={teamId}
              teamLabel={teamLabel}
              candidates={candidates}
              playerIds={playerIds}
              takenElsewhere={takenElsewhere}
              onCancel={() => discard.guard(onClose)}
              onDirtyChange={discard.setDirty}
              onSave={onSave}
            />
          )}
        </SheetContent>
      </Sheet>
      {discard.dialog}
    </>
  );
}

function TeamPlayersForm({
  teamLabel,
  candidates,
  playerIds,
  takenElsewhere,
  onCancel,
  onDirtyChange,
  onSave,
}: {
  teamLabel: string;
  candidates: Account[];
  playerIds: string[];
  takenElsewhere: Set<string>;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (playerIds: string[]) => void;
}) {
  // A fixed order, so picking and unpicking someone does not count as a change.
  const rank = new Map(candidates.map((account, index) => [account.id, index]));
  const ordered = (ids: Iterable<string>) =>
    [...ids].sort((a, b) => (rank.get(a) ?? candidates.length) - (rank.get(b) ?? candidates.length));

  const { form, formProps, dirty } = useTeamPlayersForm({ playerIds: ordered(playerIds), onSave });
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  return (
    <form {...formProps} className="flex min-h-0 flex-1 flex-col gap-4">
      <SheetHeader className="px-5 pt-2 pb-0">
        <SheetTitle>{teamLabel} players</SheetTitle>
        <SheetDescription>Choose from the session members.</SheetDescription>
      </SheetHeader>
      <form.Field name="playerIds">
        {(field) => (
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
                      checked={field.state.value.includes(account.id)}
                      disabled={blocked}
                      onCheckedChange={(on) => {
                        const rest = field.state.value.filter((id) => id !== account.id);
                        field.handleChange(ordered(on === true ? [...rest, account.id] : rest));
                      }}
                      className="size-6 rounded-full"
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </form.Field>
      <SheetFooter className="px-5 pb-6">
        <Button type="submit" size="lg">
          Done
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </SheetFooter>
    </form>
  );
}
