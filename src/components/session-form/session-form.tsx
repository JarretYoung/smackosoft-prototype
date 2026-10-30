"use client";

import { MapPin, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { removeMembers, saveGuests, saveMembers, saveSessions } from "@/src/app/actions";
import { lookupMapsPlace } from "@/src/app/maps-actions";
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
import { Spinner } from "@/src/components/ui/spinner";
import { ROLE_CAN, ROLE_LABEL } from "@/src/lib/roles";
import { SessionSave, type Account, type GrantableRole, type Role } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import {
  addDays,
  clock12,
  coordinatesShort,
  dayShort,
  durationLabel,
  isoToTimeInput,
  localToIso,
  longDate,
  minutesToTime,
  timeToMinutes,
  weekdayDate,
} from "@/src/lib/format";
import { isShortMapsLink, parseMapsLink, type MapsLink } from "@/src/lib/maps-link";
import { useRevealFirstError } from "@/src/lib/reveal-errors";
import { useUnsavedChanges } from "@/src/lib/unsaved-changes";
import { validate, visibleErrors } from "@/src/lib/validate";
import { AddMembersSheet, type NewGuest } from "./add-members-sheet";
import { CoverTile } from "./cover-tile";
import { DateSheet } from "./date-sheet";
import { CourtFeeField } from "./court-fee-field";
import { TimeSheet, timeChips } from "./time-sheet";
import { ValueRow } from "./value-row";

export type MemberDraft = {
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
  /** Where the saved link points. Both or neither. */
  latitude: number | null;
  longitude: number | null;
  /** An ISO timestamp, or "" when not set. */
  startTime: string;
  /** An ISO timestamp, or "" when not set. */
  endTime: string;
  coverUrl: string;
  courtFee: string;
  currency: string;
  members: MemberDraft[];
};

const DAY = 24 * 60;
/** Common start times for an evening or morning game. Not taken from history. */
const START_CHIPS = timeChips(["07:00", "09:00", "18:00", "19:00", "20:00", "21:00"]);
const END_CHIPS = timeChips(["09:00", "11:00", "20:00", "21:00", "22:00", "23:00"]);
/** Session lengths offered as end times once there is a start, in minutes. */
const END_AFTER = [60, 90, 120, 150, 180];

/** What to do about each field, in place of the contract's developer wording. */
const COPY: Record<string, string> = {
  label: "Give the session a name",
  date: "Pick a date",
  endTime: "Pick an end after the start",
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
  /** Suggestions for the member picker. */
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
  // Goes away with the form migration (the form state is created after hydration there).
  const [startTime, setStartTime] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartTime(initial.startTime ? isoToTimeInput(initial.startTime) : "");
  }, [initial.startTime]);
  const [endTime, setEndTime] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEndTime(initial.endTime ? isoToTimeInput(initial.endTime) : "");
  }, [initial.endTime]);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl);
  const [courtFee, setCourtFee] = useState(initial.courtFee);
  const [currency, setCurrency] = useState(initial.currency || "MYR");
  const [members, setMembers] = useState<MemberDraft[]>(initial.members);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [rejections, setRejections] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const [pickTime, setPickTime] = useState<"start" | "end" | null>(null);
  const [pending, start] = useTransition();

  const mapsLink = locationUrl.trim() === "" ? null : parseMapsLink(locationUrl);
  // A short link hides its place name behind a redirect, so the server looks it up. Keyed by link.
  const [looked, setLooked] = useState<Record<string, MapsLink | null>>({});
  const shortLink = isShortMapsLink(locationUrl) ? locationUrl.trim() : null;
  const lookingUp = shortLink !== null && !(shortLink in looked);
  useEffect(() => {
    if (!shortLink || shortLink in looked) return;
    let current = true;
    const timer = setTimeout(async () => {
      const place = await lookupMapsPlace(shortLink);
      if (current) setLooked((l) => ({ ...l, [shortLink]: place }));
    }, 400);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [shortLink, looked]);
  // Offer the name from a pasted link when the location says something else.
  const linkPlace = mapsLink?.name || mapsLink?.latitude != null ? mapsLink : shortLink ? (looked[shortLink] ?? null) : null;
  const mapsName = linkPlace?.name && linkPlace.name !== location.trim() ? linkPlace.name : null;
  // The pin follows the link. Coordinates that came with the saved link stay while the link is unchanged.
  const unchangedLink = locationUrl.trim() === initial.locationUrl.trim();
  const pin =
    linkPlace?.latitude != null && linkPlace.longitude != null
      ? { latitude: linkPlace.latitude, longitude: linkPlace.longitude }
      : unchangedLink && initial.latitude != null && initial.longitude != null
        ? { latitude: initial.latitude, longitude: initial.longitude }
        : null;

  const fee = courtFee.trim() === "" ? null : Number(courtFee);
  const startIso = startTime === "" ? "" : localToIso(date, startTime);
  // An end earlier than the start is the next day, so a game can run past midnight.
  const endSameDay = endTime === "" ? "" : localToIso(date, endTime);
  const endNextDay = !!startIso && !!endSameDay && Date.parse(endSameDay) < Date.parse(startIso);
  const endIso = endNextDay ? new Date(Date.parse(endSameDay) + DAY * 60_000).toISOString() : endSameDay;
  // How long it runs, when both times are set.
  const runMinutes = startTime && endTime ? (timeToMinutes(endTime) - timeToMinutes(startTime) + DAY) % DAY : null;
  const runHint = runMinutes ? `${durationLabel(runMinutes)} long` : undefined;
  const endChips = startTime
    ? timeChips(END_AFTER.map((m) => minutesToTime((timeToMinutes(startTime) + m) % DAY)))
    : END_CHIPS;
  const session = {
    id: initial.id,
    label,
    date,
    location: location.trim() === "" ? null : location,
    locationUrl: locationUrl.trim() === "" ? null : locationUrl.trim(),
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
    startTime: startIso || null,
    endTime: endIso || null,
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
    endTime !== (initial.endTime ? isoToTimeInput(initial.endTime) : "") ||
    members.length !== initial.members.length ||
    members.some((p) => initial.members.find((q) => q.account.id === p.account.id)?.role !== p.role);
  useUnsavedChanges(dirty && !pending);
  // A pin found from the link can be saved on its own, but it is not something to warn about when leaving.
  const pinChanged = pin?.latitude !== (initial.latitude ?? undefined) || pin?.longitude !== (initial.longitude ?? undefined);

  const canGrantManager = viewerRole === "OWNER";

  function addAccounts(accounts: (Account | NewGuest)[]) {
    setMembers((list) => [
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
    setMembers((list) => list.map((p) => (p.account.id === id ? { ...p, role } : p)));
  const removeMember = (id: string) => setMembers((list) => list.filter((p) => p.account.id !== id));

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

      const guests = members.filter((p) => p.newGuest);
      if (guests.length) {
        const result = await saveGuests(
          guests.map((g) => ({ id: g.account.id, displayName: g.account.displayName, handle: g.account.handle })),
        );
        if (!result.ok) return fail(result.error);
      }

      const wanted = new Map(members.map((p) => [p.account.id, p]));
      const before = new Map(initial.members.map((p) => [p.account.id, p]));
      const toSave = members
        .filter((p) => p.role !== "OWNER" && (before.get(p.account.id)?.role !== p.role || !before.has(p.account.id)))
        .map((p) => ({ sessionId: initial.id, accountId: p.account.id, role: p.role as GrantableRole }));
      const toRemove = initial.members
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
      <CoverTile url={coverUrl} onChange={setCoverUrl} onBlur={touch("coverUrl")} error={errors.coverUrl} />

      <Field
        data-invalid={!!errors.label}
        className="gap-1 rounded-2xl bg-card px-4 pt-3 pb-4 shadow-card transition-shadow focus-within:ring-[3px] focus-within:ring-ring"
      >
        <FieldLabel htmlFor="label" className="section-label px-0">
          Name
        </FieldLabel>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={touch("label")}
          placeholder="Badminton with da Laddies"
          enterKeyHint="next"
          aria-invalid={!!errors.label}
          className="w-full min-w-0 bg-transparent text-xl font-bold tracking-tight text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50"
        />
        <FieldError>{errors.label}</FieldError>
      </Field>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">When</h2>
        <ul className="group-list">
          <li>
            <ValueRow
              id="date"
              label="Date"
              value={date ? weekdayDate(date) : null}
              placeholder="Pick a date"
              invalid={!!errors.date}
              onClick={() => setPickDate(true)}
            />
          </li>
          <li>
            <ValueRow
              label="Starts"
              value={startTime ? clock12(startTime) : null}
              placeholder="Not set"
              onClick={() => setPickTime("start")}
            />
          </li>
          <li>
            <ValueRow
              id="endTime"
              label="Ends"
              value={endTime ? `${clock12(endTime)}${endNextDay ? `, ${dayShort(addDays(date, 1))}` : ""}` : null}
              placeholder="Not set"
              invalid={!!errors.endTime}
              onClick={() => setPickTime("end")}
            />
          </li>
        </ul>
        <FieldError className="px-1">{errors.date ?? errors.endTime}</FieldError>
      </section>

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
          {mapsName && (
            <Button
              type="button"
              variant="tinted"
              size="sm"
              className="h-auto min-h-9 self-start py-1.5 text-left whitespace-normal"
              onClick={() => setLocation(mapsName)}
            >
              Use “{mapsName}” as the location
            </Button>
          )}
          {lookingUp && <p className="text-sm text-muted-foreground">Looking up the place</p>}
          {pin && !lookingUp && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin aria-hidden className="size-4 text-primary" />
              <span className="tabular-nums">{coordinatesShort(pin.latitude, pin.longitude)}</span>
            </p>
          )}
          {mapsLink && !mapsLink.isMaps && !errors.locationUrl && (
            <p className="text-sm text-muted-foreground">This does not look like a maps link. It will still be saved.</p>
          )}
        </Field>
      </FormSection>

      <section className="flex flex-col gap-2">
        <h2 className="section-label">
          Court fee{" "}
          <span className="tracking-normal normal-case">
            <OptionalTag />
          </span>
        </h2>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <Field data-invalid={!!(errors.courtFee || errors.currency)}>
            <CourtFeeField
              id="fee"
              amount={courtFee}
              currency={currency}
              onAmount={setCourtFee}
              onCurrency={setCurrency}
              onBlur={touch("courtFee")}
              invalid={!!errors.courtFee}
            />
            <FieldError>{errors.courtFee ?? errors.currency}</FieldError>
          </Field>
        </div>
      </section>

      <section aria-labelledby="members-heading" className="flex flex-col gap-2">
        <h2 id="members-heading" className="section-label">
          Members
        </h2>
        <ul className="group-list">
          {members.map((p) => (
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
                    <DropdownMenuItem variant="destructive" onSelect={() => removeMember(p.account.id)}>
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
          <li>
            <AddRow onClick={() => setAdding(true)}>Add member</AddRow>
          </li>
        </ul>
      </section>

      <div className="glass-bar sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" size="lg" className="w-full" disabled={pending || (mode === "edit" && !dirty && !pinChanged)}>
          {pending && <Spinner />}
          {pending ? "Saving" : mode === "create" ? "Create session" : "Save changes"}
        </Button>
      </div>

      <DateSheet open={pickDate} onOpenChange={setPickDate} value={date} onChange={setDate} />
      <TimeSheet
        open={pickTime === "start"}
        onOpenChange={(open) => !open && setPickTime(null)}
        title="Starts"
        value={startTime}
        onChange={setStartTime}
        quick={START_CHIPS}
        restAt={19 * 60}
        hint={runHint}
        clearLabel="No start time"
      />
      <TimeSheet
        open={pickTime === "end"}
        onOpenChange={(open) => !open && setPickTime(null)}
        title="Ends"
        value={endTime}
        onChange={setEndTime}
        quick={endChips}
        restAt={startTime ? timeToMinutes(startTime) + 120 : 21 * 60}
        // With a start, the tape covers the 24 hours after it, so every spot is one real date and time.
        min={startTime ? timeToMinutes(startTime) + 15 : undefined}
        max={startTime ? timeToMinutes(startTime) + DAY - 15 : undefined}
        marks={startTime ? [{ at: DAY, label: dayShort(addDays(date, 1)) }] : undefined}
        nextDay={endNextDay}
        nextDayLabel={dayShort(addDays(date, 1))}
        hint={runHint}
        clearLabel="No end time"
      />

      <AddMembersSheet
        open={adding}
        onOpenChange={setAdding}
        people={people}
        existingIds={new Set(members.map((p) => p.account.id))}
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
