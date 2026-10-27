"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { findAccountByHandle } from "@/src/app/actions";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import type { Account } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { guestHandle } from "@/src/lib/guest";

/** A guest that does not exist yet. It is created when the session is saved. */
export type NewGuest = Account & { isNew: true };

/**
 * Stage people to add: look up a real account by handle, or make a guest by name.
 * Nothing is saved here. The parent decides what to do on confirm.
 */
export function AddParticipantsSheet({
  open,
  onOpenChange,
  existingIds,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: Set<string>;
  onConfirm: (accounts: (Account | NewGuest)[]) => void;
}) {
  const [handle, setHandle] = useState("");
  const [guestName, setGuestName] = useState("");
  const [staged, setStaged] = useState<(Account | NewGuest)[]>([]);
  const [looking, start] = useTransition();

  const has = (id: string) => existingIds.has(id) || staged.some((a) => a.id === id);

  function invite() {
    const wanted = handle.trim().replace(/^@/, "").toLowerCase();
    if (!wanted) return;
    start(async () => {
      const result = await findAccountByHandle({ handle: wanted });
      if (!result.ok) return void toast.error(errorMessage(result.error));
      if (!result.data) return void toast.error(`No one has the handle @${wanted}`);
      if (has(result.data.id)) return void toast.message(`${result.data.displayName} is already added`);
      setStaged((list) => [...list, result.data!]);
      setHandle("");
    });
  }

  function addGuest() {
    const name = guestName.trim();
    if (!name) return;
    setStaged((list) => [
      ...list,
      { id: crypto.randomUUID(), displayName: name, handle: guestHandle(name), avatarUrl: null, isGuest: true, isNew: true },
    ]);
    setGuestName("");
  }

  function confirm() {
    onConfirm(staged);
    setStaged([]);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetHeader className="px-5 pt-2 pb-0">
          <SheetTitle>Add participants</SheetTitle>
          <SheetDescription>Invite someone by handle, or add a guest who has no account.</SheetDescription>
        </SheetHeader>

        <FieldGroup className="px-5">
          <Field>
            <FieldLabel htmlFor="invite">Invite by handle</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="invite"
                placeholder="@username"
                value={handle}
                autoCapitalize="none"
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), invite())}
              />
              <Button type="button" variant="tinted" size="icon" onClick={invite} disabled={looking} aria-label="Invite">
                <Plus />
              </Button>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="guest">Or create a guest</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="guest"
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
              />
              <Button type="button" variant="tinted" size="icon" onClick={addGuest} aria-label="Add guest">
                <Plus />
              </Button>
            </div>
          </Field>

          {staged.length > 0 && (
            <ul className="group-list border border-border/60 shadow-none">
              {staged.map((account) => (
                <li key={account.id} className="flex items-center gap-3 px-4 py-2.5">
                  <PersonAvatar person={account} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-semibold">{account.displayName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {account.isGuest ? "Guest" : `@${account.handle}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${account.displayName}`}
                    onClick={() => setStaged((list) => list.filter((a) => a.id !== account.id))}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </FieldGroup>

        <SheetFooter className="px-5 pb-6">
          <Button type="button" size="lg" onClick={confirm} disabled={staged.length === 0}>
            {staged.length > 0 ? `Add ${staged.length}` : "Add"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
