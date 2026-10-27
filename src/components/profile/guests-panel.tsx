"use client";

import { Check, Copy, MoreHorizontal, Plus, UserRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClaim, removeGuests, saveGuests } from "@/src/app/actions";
import { PersonAvatar } from "@/src/components/avatar-stack";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/src/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Spinner } from "@/src/components/ui/spinner";
import type { Guest } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { guestHandle } from "@/src/lib/guest";

type Dialogs =
  | { kind: "add" }
  | { kind: "edit"; guest: Guest }
  | { kind: "delete"; guest: Guest }
  | { kind: "claim"; guest: Guest; token: string };

/**
 * The guests you created. Add one, rename it, give it a new handle, hand it over with a claim
 * code, or delete it. A deleted guest stays in past matches and frees its handle.
 */
export function GuestsPanel({ guests }: { guests: Guest[] }) {
  const [dialog, setDialog] = useState<Dialogs | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const close = () => setDialog(null);

  /** A problem with what was typed shows in the form it came from. Other failures are a toast. */
  function run(action: () => Promise<{ ok: true } | { ok: false; error: Parameters<typeof errorMessage>[0] }>, done: string) {
    start(async () => {
      const result = await action();
      if (!result.ok) {
        if (dialog?.kind === "add" || dialog?.kind === "edit") setErrors({ form: errorMessage(result.error) });
        else toast.error(errorMessage(result.error));
        return;
      }
      toast.success(done);
      close();
    });
  }

  function openAdd() {
    setName("");
    setErrors({});
    setDialog({ kind: "add" });
  }
  function openEdit(guest: Guest) {
    setName(guest.displayName);
    setHandle(guest.handle);
    setErrors({});
    setDialog({ kind: "edit", guest });
  }
  function makeClaim(guest: Guest) {
    start(async () => {
      const result = await createClaim({ guestId: guest.id });
      if (!result.ok) return void toast.error(errorMessage(result.error));
      setCopied(false);
      setDialog({ kind: "claim", guest, token: result.data.token });
    });
  }

  const claimLink = (token: string) => `${window.location.origin}/onboarding?claim=${token}`;

  return (
    <section aria-labelledby="guests-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 id="guests-heading" className="section-label">
          Guests you created
        </h2>
        <Button size="sm" variant="tinted" onClick={openAdd}>
          <Plus /> Add guest
        </Button>
      </div>

      {guests.length === 0 ? (
        <Empty className="bg-card shadow-card">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-accent text-primary">
              <UserRound />
            </EmptyMedia>
            <EmptyTitle>No guests yet</EmptyTitle>
            <EmptyDescription>Guests are people without an account. Add one here or from a session.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="group-list">
          {guests.map((guest) => (
            <li key={guest.id} className="flex items-center gap-3 px-4 py-3">
              <PersonAvatar person={guest} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{guest.displayName}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  @{guest.handle}
                  {guest.hasClaimCode && <Badge variant="tinted">Code ready</Badge>}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Options for ${guest.displayName}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem onSelect={() => openEdit(guest)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => makeClaim(guest)}>Invite to claim</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ kind: "delete", guest })}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={dialog?.kind === "add"} onOpenChange={(open) => !open && close()}>
        <SheetContent side="bottom">
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim() || pending) return;
              run(() => saveGuests([{ id: crypto.randomUUID(), displayName: name.trim(), handle: guestHandle(name) }]), "Guest added");
            }}
          >
            <SheetHeader className="px-5 pt-2 pb-0">
              <SheetTitle>Add a guest</SheetTitle>
              <SheetDescription>A guest can play in your sessions without signing up.</SheetDescription>
            </SheetHeader>
            <FieldGroup className="px-5">
              <Field data-invalid={!!errors.form}>
                <FieldLabel htmlFor="guest-name">Name</FieldLabel>
                <Input
                  id="guest-name"
                  value={name}
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-invalid={!!errors.form}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors({});
                  }}
                  placeholder="Aadit"
                />
                <FieldError>{errors.form}</FieldError>
              </Field>
            </FieldGroup>
            <SheetFooter className="px-5 pb-6">
              <Button type="submit" size="lg" disabled={pending || !name.trim()}>
                {pending && <Spinner />}
                Add guest
              </Button>
              <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={dialog?.kind === "edit"} onOpenChange={(open) => !open && close()}>
        <SheetContent side="bottom">
          <form
            className="flex min-h-0 flex-1 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (dialog?.kind !== "edit" || !name.trim() || !handle.trim() || pending) return;
              const guest = dialog.guest;
              run(
                () => saveGuests([{ id: guest.id, displayName: name.trim(), handle: handle.trim().toLowerCase() }]),
                "Guest saved",
              );
            }}
          >
            <SheetHeader className="px-5 pt-2 pb-0">
              <SheetTitle>Edit guest</SheetTitle>
              <SheetDescription>A handle can change a few times in total, so pick it with care.</SheetDescription>
            </SheetHeader>
            <FieldGroup className="px-5">
              <Field>
                <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                <Input id="edit-name" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field data-invalid={!!errors.form}>
                <FieldLabel htmlFor="edit-handle">Handle</FieldLabel>
                <Input
                  id="edit-handle"
                  value={handle}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  enterKeyHint="done"
                  aria-invalid={!!errors.form}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setErrors({});
                  }}
                />
                <FieldError>{errors.form}</FieldError>
              </Field>
            </FieldGroup>
            <SheetFooter className="px-5 pb-6">
              <Button
                type="submit"
                size="lg"
                disabled={
                  pending ||
                  !name.trim() ||
                  !handle.trim() ||
                  (dialog?.kind === "edit" && name.trim() === dialog.guest.displayName && handle.trim() === dialog.guest.handle)
                }
              >
                {pending && <Spinner />}
                Save changes
              </Button>
              <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                Cancel
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={dialog?.kind === "delete"} onOpenChange={(open) => !open && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {dialog?.kind === "delete" ? dialog.guest.displayName : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              They stay in matches already played, and their handle becomes free. You cannot add them to new sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                if (dialog?.kind === "delete") run(() => removeGuests([dialog.guest.id]), "Guest deleted");
              }}
            >
              Delete guest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={dialog?.kind === "claim"} onOpenChange={(open) => !open && close()}>
        <SheetContent side="bottom">
          <SheetHeader className="px-5 pt-2 pb-0">
            <SheetTitle>Invite {dialog?.kind === "claim" ? dialog.guest.displayName : ""} to claim</SheetTitle>
            <SheetDescription>
              Send them this link. When they sign up and open it, this guest becomes their account with all its history.
              Making a new code stops the old one working.
            </SheetDescription>
          </SheetHeader>
          {dialog?.kind === "claim" && (
            <FieldGroup className="px-5">
              <Field>
                <FieldLabel>Code</FieldLabel>
                <p className="rounded-xl bg-muted px-3.5 py-3 font-mono text-sm break-all">{dialog.token}</p>
              </Field>
              <Field>
                <FieldLabel htmlFor="claim-link">Link</FieldLabel>
                <div className="flex gap-2">
                  <Input id="claim-link" readOnly value={claimLink(dialog.token)} />
                  <Button
                    variant="tinted"
                    size="icon"
                    aria-label="Copy link"
                    onClick={async () => {
                      await navigator.clipboard.writeText(claimLink(dialog.token));
                      setCopied(true);
                    }}
                  >
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </div>
              </Field>
            </FieldGroup>
          )}
          <SheetFooter className="px-5 pb-6">
            <Button size="lg" onClick={close}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
