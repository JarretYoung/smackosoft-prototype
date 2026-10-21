"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMembers, saveGuests, saveMembers, saveSessions } from "@/src/app/actions";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { SessionSave, type Account, type GrantableRole, type Role } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { AddParticipantsSheet, type NewGuest } from "./add-participants-sheet";

export type Participant = {
  account: Account;
  role: Role;
  isPlayer: boolean;
  /** A guest that must be created before it can be added. */
  newGuest: boolean;
};

export type SessionFormInitial = {
  id: string;
  label: string;
  date: string;
  location: string;
  courtFee: string;
  currency: string;
  participants: Participant[];
};

const CURRENCIES = ["MYR", "SGD", "USD", "GBP", "EUR"];
const ROLE_LABEL: Record<Role, string> = { OWNER: "Owner", MANAGER: "Manager", EDITOR: "Editor", VIEWER: "Viewer" };

/**
 * Create or edit a session and its members. Everything is staged in this form.
 * Save runs the writes in order: session, guests, members. Each write is replay safe,
 * so a failed save can simply be tried again.
 */
export function SessionForm({
  mode,
  initial,
  viewerRole,
}: {
  mode: "create" | "edit";
  initial: SessionFormInitial;
  viewerRole: Role;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initial.label);
  const [date, setDate] = useState(initial.date);
  const [location, setLocation] = useState(initial.location);
  const [courtFee, setCourtFee] = useState(initial.courtFee);
  const [currency, setCurrency] = useState(initial.currency || "MYR");
  const [participants, setParticipants] = useState<Participant[]>(initial.participants);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const canGrantManager = viewerRole === "OWNER";
  const back = mode === "edit" ? `/sessions/${initial.id}` : "/sessions";

  function addAccounts(accounts: (Account | NewGuest)[]) {
    setParticipants((list) => [
      ...list,
      ...accounts.map((account) => ({
        account,
        role: "VIEWER" as Role,
        isPlayer: false,
        newGuest: "isNew" in account,
      })),
    ]);
  }

  const setRole = (id: string, role: Role) =>
    setParticipants((list) => list.map((p) => (p.account.id === id ? { ...p, role } : p)));
  const removeParticipant = (id: string) => setParticipants((list) => list.filter((p) => p.account.id !== id));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const fee = courtFee.trim() === "" ? null : Number(courtFee);
    const session = {
      id: initial.id,
      label,
      date,
      location: location.trim() === "" ? null : location,
      courtFee: fee,
      currency: fee === null ? null : currency,
    };
    const checked = SessionSave.safeParse(session);
    if (!checked.success) {
      setErrors(Object.fromEntries(checked.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});

    start(async () => {
      const fail = (error: Parameters<typeof errorMessage>[0]) => void toast.error(errorMessage(error));

      const saved = await saveSessions([session]);
      if (!saved.ok) return fail(saved.error);

      const guests = participants.filter((p) => p.newGuest);
      if (guests.length) {
        const result = await saveGuests(
          guests.map((g) => ({ id: g.account.id, displayName: g.account.displayName, handle: g.account.handle })),
        );
        if (!result.ok) return fail(result.error);
      }

      const wanted = new Map(participants.map((p) => [p.account.id, p]));
      const before = new Map(initial.participants.map((p) => [p.account.id, p]));
      const toSave = participants
        .filter((p) => p.role !== "OWNER" && (before.get(p.account.id)?.role !== p.role || !before.has(p.account.id)))
        .map((p) => ({ sessionId: initial.id, accountId: p.account.id, role: p.role as GrantableRole }));
      const toRemove = initial.participants
        .filter((p) => p.role !== "OWNER" && !wanted.has(p.account.id))
        .map((p) => ({ sessionId: initial.id, accountId: p.account.id }));

      if (toSave.length) {
        const result = await saveMembers(toSave);
        if (!result.ok) return fail(result.error);
      }
      if (toRemove.length) {
        const result = await removeMembers(toRemove);
        if (!result.ok) return fail(result.error);
      }

      toast.success(mode === "create" ? "Session created" : "Session saved");
      router.replace(`/sessions/${initial.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6 px-5 pb-6 pt-5">
      <div className="space-y-2">
        <Label htmlFor="label">Title</Label>
        <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Badminton with da Laddies" />
        {errors.label && <p className="text-sm text-destructive">{errors.label}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee">Court fee</Label>
          <div className="flex gap-2">
            <Input
              id="fee"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={courtFee}
              onChange={(e) => setCourtFee(e.target.value)}
            />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-24" aria-label="Currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(errors.courtFee || errors.currency) && (
            <p className="text-sm text-destructive">{errors.courtFee ?? errors.currency}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sunway Serene" />
        {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Participants</h2>
        <ul className="divide-y rounded-2xl border bg-card">
          {participants.map((p) => (
            <li key={p.account.id} className="flex items-center gap-3 p-3">
              <PersonAvatar person={p.account} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.account.isGuest && <span className="text-muted-foreground">(Guest) </span>}
                  {p.account.displayName}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {ROLE_LABEL[p.role]}
                  {p.isPlayer && <Badge variant="secondary">Player</Badge>}
                </p>
              </div>
              {p.role !== "OWNER" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Options for ${p.account.displayName}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change role</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={p.role} onValueChange={(v) => setRole(p.account.id, v as Role)}>
                      <DropdownMenuRadioItem value="VIEWER">Viewer</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="EDITOR">Editor</DropdownMenuRadioItem>
                      {(canGrantManager || p.role === "MANAGER") && (
                        <DropdownMenuRadioItem value="MANAGER" disabled={!canGrantManager}>
                          Manager
                        </DropdownMenuRadioItem>
                      )}
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => removeParticipant(p.account.id)}>
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus /> Add participant
        </Button>
      </section>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href={back}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
      </div>

      <AddParticipantsSheet
        open={adding}
        onOpenChange={setAdding}
        existingIds={new Set(participants.map((p) => p.account.id))}
        onConfirm={addAccounts}
      />
    </form>
  );
}
