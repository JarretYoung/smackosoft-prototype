"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMembers, saveGuests, saveMembers, saveSessions } from "@/src/app/actions";
import { AddRow } from "@/src/components/add-row";
import { PersonAvatar } from "@/src/components/avatar-stack";
import { Badge } from "@/src/components/ui/badge";
import { OptionalTag } from "@/src/components/optional-tag";
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
import { clock12, durationLabel, isoToTimeInput, localToIso, longDate, minutesBetween } from "@/src/lib/format";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import { LeaveLink, useUnsavedChanges } from "@/src/lib/unsaved-changes";
import { validate, visibleErrors } from "@/src/lib/validate";
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
const ROLE_CAN: Record<"VIEWER" | "EDITOR" | "MANAGER", string> = {
  VIEWER: "Can see the session and its videos",
  EDITOR: "Can also edit matches, scores and players",
  MANAGER: "Can also edit the session and manage people",
};

/** Half hour steps from 30 minutes to 6 hours. */
const DURATIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 30);
const NO_END = "none";

/** What to do about each field, in place of the contract's developer wording. */
const COPY: Record<string, string> = {
  label: "Give the session a title",
  date: "Pick a date",
  locationUrl: "Paste a full link, starting with https://",
  coverUrl: "Paste a full link, starting with https://",
  courtFee: "Enter an amount of 0 or more",
};

/**
 * Create or edit a session and its members. Everything is staged in this form.
 * Save runs the writes in order: session, guests, members. Each write is replay safe,
 * so a failed save can simply be tried again.
 */
export function SessionForm({
  mode,
  initial,
  viewerRole,
  people,
  prefilledFrom,
}: {
  mode: "create" | "edit";
  initial: SessionFormInitial;
  viewerRole: Role;
  /** Suggestions for the participant picker. */
  people: Account[];
  /** The date of the session the defaults came from, so the form can say where they are from. */
  prefilledFrom?: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initial.label);
  const [date, setDate] = useState(initial.date);
  const [location, setLocation] = useState(initial.location);
  const [locationUrl, setLocationUrl] = useState(initial.locationUrl);
  // The inputs hold local "HH:mm". The server cannot know the browser's timezone, so fill them after mount.
  const [startTime, setStartTime] = useState("");
  useEffect(() => {
    setStartTime(initial.startTime ? isoToTimeInput(initial.startTime) : "");
  }, [initial.startTime]);
  // The end is a length, so it needs no timezone and can start from the server value.
  const initialDuration = minutesBetween(initial.startTime || null, initial.endTime || null);
  const [duration, setDuration] = useState<number | null>(initialDuration);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [courtFee, setCourtFee] = useState(initial.courtFee);
  const [currency, setCurrency] = useState(initial.currency || "MYR");
  const [participants, setParticipants] = useState<Participant[]>(initial.participants);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const fee = courtFee.trim() === "" ? null : Number(courtFee);
  const startIso = startTime === "" ? "" : localToIso(date, startTime);
  // With no start to count from, an end that was saved earlier is left as it was.
  const endIso =
    startIso && duration
      ? new Date(Date.parse(startIso) + duration * 60_000).toISOString()
      : startTime === ""
        ? initial.endTime || null
        : null;
  const session = {
    id: initial.id,
    label,
    date,
    location: location.trim() === "" ? null : location,
    locationUrl: locationUrl.trim() === "" ? null : locationUrl.trim(),
    startTime: startIso || null,
    endTime: endIso,
    coverUrl: coverUrl.trim() === "" ? null : coverUrl.trim(),
    courtFee: fee,
    currency: fee === null ? null : currency,
  };
  const issues = validate(SessionSave, session, COPY);
  const errors = visibleErrors(issues, touched, submitted);
  const touch = (field: string) => () => setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
  useRevealFirstError(rejections);

  const dirty =
    label !== initial.label ||
    date !== initial.date ||
    location !== initial.location ||
    locationUrl !== initial.locationUrl ||
    coverUrl !== initial.coverUrl ||
    courtFee !== initial.courtFee ||
    currency !== (initial.currency || "MYR") ||
    startTime !== (initial.startTime ? isoToTimeInput(initial.startTime) : "") ||
    duration !== initialDuration ||
    participants.length !== initial.participants.length ||
    participants.some((p) => initial.participants.find((q) => q.account.id === p.account.id)?.role !== p.role);
  useUnsavedChanges(dirty && !pending);

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
    setSubmitted(true);
    if (Object.keys(issues).length) {
      setRejections((n) => n + 1);
      return;
    }

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
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 px-4 pt-4 pb-4">
      {mode === "create" && prefilledFrom && (
        <p className="px-1 text-sm text-muted-foreground">
          Location, time and fee come from your session on {longDate(prefilledFrom)}. Change anything.
        </p>
      )}
      <FormSection title="Basics">
        <Field data-invalid={!!errors.label}>
          <FieldLabel htmlFor="label">Title</FieldLabel>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={touch("label")}
            placeholder="Badminton with da Laddies"
            enterKeyHint="next"
            aria-invalid={!!errors.label}
          />
          <FieldError>{errors.label}</FieldError>
        </Field>
      </FormSection>

      <FormSection title="When">
        <Field data-invalid={!!errors.date}>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={touch("date")}
            aria-invalid={!!errors.date}
          />
          <FieldError>{errors.date}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="start">
              Starts <OptionalTag />
            </FieldLabel>
            <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="length">
              Length <OptionalTag />
            </FieldLabel>
            <Select
              value={duration ? String(duration) : NO_END}
              onValueChange={(v) => setDuration(v === NO_END ? null : Number(v))}
              disabled={startTime === ""}
            >
              <SelectTrigger id="length" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_END}>{startTime === "" ? "Set a start first" : "Not set"}</SelectItem>
                {(duration && !DURATIONS.includes(duration) ? [...DURATIONS, duration].sort((a, b) => a - b) : DURATIONS).map(
                  (m) => (
                    <SelectItem key={m} value={String(m)}>
                      {durationLabel(m)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {startIso && endIso && (
          <p className="text-sm text-muted-foreground">Ends at {clock12(isoToTimeInput(endIso))}</p>
        )}
      </FormSection>

      <FormSection title="Where">
        <Field data-invalid={!!errors.location}>
          <FieldLabel htmlFor="location">
            Location <OptionalTag />
          </FieldLabel>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={touch("location")}
            placeholder="Sunway Serene"
            aria-invalid={!!errors.location}
          />
          <FieldError>{errors.location}</FieldError>
        </Field>
        <Field data-invalid={!!errors.locationUrl}>
          <FieldLabel htmlFor="maps">
            Maps link <OptionalTag />
          </FieldLabel>
          <Input
            id="maps"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            onBlur={touch("locationUrl")}
            placeholder="https://maps.app.goo.gl/..."
            aria-invalid={!!errors.locationUrl}
          />
          <FieldError>{errors.locationUrl}</FieldError>
        </Field>
      </FormSection>

      <FormSection title="Details">
        <Field data-invalid={!!(errors.courtFee || errors.currency)}>
          <FieldLabel htmlFor="fee">
            Court fee <OptionalTag />
          </FieldLabel>
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
              onBlur={touch("courtFee")}
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
          <FieldLabel htmlFor="cover">
            Cover image <OptionalTag />
          </FieldLabel>
          <Input
            id="cover"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            onBlur={touch("coverUrl")}
            placeholder="Link to an image"
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
            <li key={p.account.id} className="list-row">
              <PersonAvatar person={p.account} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold tracking-tight">
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
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Change role</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={p.role} onValueChange={(v) => setRole(p.account.id, v as Role)}>
                      {(["VIEWER", "EDITOR", "MANAGER"] as const)
                        .filter((role) => role !== "MANAGER" || canGrantManager || p.role === "MANAGER")
                        .map((role) => (
                          <DropdownMenuRadioItem key={role} value={role} disabled={role === "MANAGER" && !canGrantManager}>
                            <span className="flex flex-col">
                              {ROLE_LABEL[role]}
                              <span className="text-xs text-muted-foreground">{ROLE_CAN[role]}</span>
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
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
          <li>
            <AddRow onClick={() => setAdding(true)}>Add participant</AddRow>
          </li>
        </ul>
      </section>

      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Saving" : mode === "create" ? "Create session" : "Save changes"}
        </Button>
        <Button asChild variant="ghost" size="lg">
          <LeaveLink href={back}>Cancel</LeaveLink>
        </Button>
      </div>

      <AddParticipantsSheet
        open={adding}
        onOpenChange={setAdding}
        people={people}
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
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <FieldGroup>{children}</FieldGroup>
      </div>
    </section>
  );
}
