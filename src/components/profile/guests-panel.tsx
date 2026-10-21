"use client";

import { Check, Copy, MoreHorizontal, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClaim, removeGuests, saveGuests } from "@/src/app/actions";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
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
  const [pending, start] = useTransition();

  const close = () => setDialog(null);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: Parameters<typeof errorMessage>[0] }>, done: string) {
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(errorMessage(result.error));
      toast.success(done);
      close();
    });
  }

  function openAdd() {
    setName("");
    setDialog({ kind: "add" });
  }
  function openEdit(guest: Guest) {
    setName(guest.displayName);
    setHandle(guest.handle);
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
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Guests you created</h2>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus /> Add guest
        </Button>
      </div>

      {guests.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-5 text-center text-sm text-muted-foreground">
          Guests are people without an account. Add one here or from a session.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {guests.map((guest) => (
            <li key={guest.id} className="flex items-center gap-3 p-3">
              <PersonAvatar person={guest} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{guest.displayName}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  @{guest.handle}
                  {guest.hasClaimCode && <Badge variant="secondary">Code ready</Badge>}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Options for ${guest.displayName}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

      <Dialog open={dialog?.kind === "add"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a guest</DialogTitle>
            <DialogDescription>A guest can play in your sessions without signing up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="guest-name">Name</Label>
            <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aadit" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                run(
                  () => saveGuests([{ id: crypto.randomUUID(), displayName: name.trim(), handle: guestHandle(name) }]),
                  "Guest added",
                )
              }
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "edit"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit guest</DialogTitle>
            <DialogDescription>A handle can change a few times in total, so pick it with care.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-handle">Handle</Label>
              <Input id="edit-handle" value={handle} autoCapitalize="none" onChange={(e) => setHandle(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || !name.trim()}
              onClick={() =>
                dialog?.kind === "edit" &&
                run(
                  () => saveGuests([{ id: dialog.guest.id, displayName: name.trim(), handle: handle.trim().toLowerCase() }]),
                  "Guest saved",
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "delete"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {dialog?.kind === "delete" ? dialog.guest.displayName : ""}?</DialogTitle>
            <DialogDescription>
              They stay in matches already played, and their handle becomes free. You cannot add them to new sessions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => dialog?.kind === "delete" && run(() => removeGuests([dialog.guest.id]), "Guest deleted")}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "claim"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite {dialog?.kind === "claim" ? dialog.guest.displayName : ""} to claim</DialogTitle>
            <DialogDescription>
              Send them this link. When they sign up and open it, this guest becomes their account with all its history.
              Making a new code stops the old one working.
            </DialogDescription>
          </DialogHeader>
          {dialog?.kind === "claim" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Code</Label>
                <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm">{dialog.token}</p>
              </div>
              <div className="flex gap-2">
                <Input readOnly value={claimLink(dialog.token)} aria-label="Claim link" />
                <Button
                  variant="outline"
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
            </div>
          )}
          <DialogFooter>
            <Button onClick={close}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
