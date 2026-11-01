"use client";

import { Check, Copy, MoreHorizontal, Plus, UserRound } from "lucide-react";
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
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import type { Guest } from "@/src/contract";
import { GuestSheetForm } from "@/src/features/profile/guest-sheet-form";
import { claimLink, useGuestsPanel } from "@/src/features/profile/use-guests-panel";
import { useSheetDiscard } from "@/src/hooks/unsaved-changes";

/**
 * The guests you created. Add one, rename it, give it a new handle, hand it over with a claim
 * code, or delete it. A deleted guest stays in past matches and frees its handle.
 */
export function GuestsPanel({ guests }: { guests: Guest[] }) {
  const { dialog, setDialog, close, formTarget, openForm, copied, copyClaimLink, pending, makeClaim, remove } =
    useGuestsPanel();
  const discard = useSheetDiscard();

  return (
    <section aria-labelledby="guests-heading" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 id="guests-heading" className="section-label">
          Guests you created
        </h2>
        <Button size="sm" variant="text" onClick={() => openForm()}>
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
            <li key={guest.id} className="list-row">
              <PersonAvatar person={guest} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold tracking-tight">{guest.displayName}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  @{guest.handle}
                  {guest.hasClaimCode && <Badge variant="tinted">Code ready</Badge>}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="bare" size="icon" className="text-muted-foreground" aria-label={`Options for ${guest.displayName}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem onSelect={() => openForm(guest)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => makeClaim(guest)}>Get claim code</DropdownMenuItem>
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

      <Sheet open={dialog?.kind === "add" || dialog?.kind === "edit"} onOpenChange={(open) => !open && discard.guard(close)}>
        <SheetContent side="bottom">
          {formTarget && (
            <GuestSheetForm
              key={formTarget.key}
              guest={formTarget.guest}
              onClose={close}
              onCancel={() => discard.guard(close)}
              onDirtyChange={discard.setDirty}
            />
          )}
        </SheetContent>
      </Sheet>
      {discard.dialog}

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
                if (dialog?.kind === "delete") remove(dialog.guest);
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
            <SheetTitle>Claim code for {dialog?.kind === "claim" ? dialog.guest.displayName : ""}</SheetTitle>
            <SheetDescription>
              Send them this link. When they sign up and open it, this guest becomes their account with all its history.
              Making a new code stops the old one working.
            </SheetDescription>
          </SheetHeader>
          {dialog?.kind === "claim" && (
            <FieldGroup className="px-5">
              <Field>
                <FieldLabel>Code</FieldLabel>
                <p className="rounded-xl bg-muted px-3.5 py-3 font-mono text-sm break-all">{dialog.code}</p>
              </Field>
              <Field>
                <FieldLabel htmlFor="claim-link">Claim link</FieldLabel>
                <div className="flex gap-2">
                  <Input id="claim-link" readOnly value={claimLink(dialog.code)} />
                  <Button
                    variant="tinted"
                    size="icon"
                    aria-label="Copy link"
                    onClick={() => copyClaimLink(dialog.code)}
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
