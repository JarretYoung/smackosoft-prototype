"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import { SessionSave, type Account, type GrantableRole, type Role } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { isoToTimeInput, localToIso } from "@/src/lib/format";
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
  locationUrl: string;
  /** An ISO timestamp, or "" when not set. */
  startTime: string;
  /** An ISO timestamp, or "" when not set. */
  endTime: string;
  coverUrl: string;
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
  const [locationUrl, setLocationUrl] = useState(initial.locationUrl);
  // The inputs hold local "HH:mm". The server cannot know the browser's timezone, so fill them after mount.
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  useEffect(() => {
    setStartTime(initial.startTime ? isoToTimeInput(initial.startTime) : "");
    setEndTime(initial.endTime ? isoToTimeInput(initial.endTime) : "");
  }, [initial.startTime, initial.endTime]);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
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
      locationUrl: locationUrl.trim() === "" ? null : locationUrl.trim(),
      startTime: startTime === "" ? null : localToIso(date, startTime),
      endTime: endTime === "" ? null : localToIso(date, endTime),
      coverUrl: coverUrl.trim() === "" ? null : coverUrl.trim(),
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
    <form onSubmit={submit} className="flex flex-col gap-6 px-4 pt-4 pb-4">
      <FormSection title="Basics">
        <Field data-invalid={!!errors.label}>
          <FieldLabel htmlFor="label">Title</FieldLabel>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Badminton with da Laddies"
            aria-invalid={!!errors.label}
          />
          <FieldError>{errors.label}</FieldError>
        </Field>
      </FormSection>

      <FormSection title="When">
        <Field data-invalid={!!errors.date}>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.date} />
          <FieldError>{errors.date}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="start">Starts</FieldLabel>
            <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field data-invalid={!!errors.endTime}>
            <FieldLabel htmlFor="end">Ends</FieldLabel>
            <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-invalid={!!errors.endTime} />
          </Field>
        </div>
        <FieldError>{errors.endTime}</FieldError>
      </FormSection>

      <FormSection title="Where">
        <Field data-invalid={!!errors.location}>
          <FieldLabel htmlFor="location">Location</FieldLabel>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Sunway Serene"
            aria-invalid={!!errors.location}
          />
          <FieldError>{errors.location}</FieldError>
        </Field>
        <Field data-invalid={!!errors.locationUrl}>
          <FieldLabel htmlFor="maps">Maps link</FieldLabel>
          <Input
            id="maps"
            inputMode="url"
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            placeholder="Optional"
            aria-invalid={!!errors.locationUrl}
          />
          <FieldError>{errors.locationUrl}</FieldError>
        </Field>
      </FormSection>

      <FormSection title="Details">
        <Field data-invalid={!!(errors.courtFee || errors.currency)}>
          <FieldLabel htmlFor="fee">Court fee</FieldLabel>
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
              aria-invalid={!!errors.courtFee}
            />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28" aria-label="Currency">
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
          <FieldError>{errors.courtFee ?? errors.currency}</FieldError>
        </Field>
        <Field data-invalid={!!errors.coverUrl}>
          <FieldLabel htmlFor="cover">Cover image</FieldLabel>
          <Input
            id="cover"
            inputMode="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="Link to an image (optional)"
            aria-invalid={!!errors.coverUrl}
          />
          <FieldError>{errors.coverUrl}</FieldError>
        </Field>
      </FormSection>

      <section aria-labelledby="participants-heading" className="flex flex-col gap-2">
        <h2 id="participants-heading" className="section-label">
          Participants
        </h2>
        <ul className="group-list">
          {participants.map((p) => (
            <li key={p.account.id} className="flex items-center gap-3 px-4 py-3">
              <PersonAvatar person={p.account} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {p.account.isGuest && <span className="font-normal text-muted-foreground">(Guest) </span>}
                  {p.account.displayName}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {ROLE_LABEL[p.role]}
                  {p.isPlayer && <Badge variant="tinted">Player</Badge>}
                </p>
              </div>
              {p.role !== "OWNER" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Options for ${p.account.displayName}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
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
        <Button type="button" variant="tinted" onClick={() => setAdding(true)}>
          <Plus /> Add participant
        </Button>
      </section>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Saving" : mode === "create" ? "Create session" : "Save changes"}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href={back}>Cancel</Link>
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

/** A titled group of fields on one white surface. */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="section-label">{title}</h2>
      <div className="rounded-3xl bg-card p-4 shadow-card">
        <FieldGroup>{children}</FieldGroup>
      </div>
    </section>
  );
}
