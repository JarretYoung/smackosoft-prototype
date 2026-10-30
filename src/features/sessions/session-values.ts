import { z } from "zod";
import { SessionSave } from "../../contract";
import { isoToTimeInput } from "../../lib/format";
import type { MapsLink } from "./maps-link";
import { membersChanged, type MemberDraft } from "./members-draft";
import { sessionTimes } from "./session-times";

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

/** What the fields hold. Times are the browser's local "HH:mm", the fee stays text so typing is never rewritten. */
export type SessionValues = {
  label: string;
  date: string;
  location: string;
  locationUrl: string;
  startTime: string;
  endTime: string;
  coverUrl: string;
  courtFee: string;
  currency: string;
  members: MemberDraft[];
};

export type Pin = { latitude: number; longitude: number };

/**
 * The field values for a saved session. The server cannot know the browser's timezone, so the
 * times stay empty until `zoned` says the browser has taken over.
 */
export function toValues(initial: SessionFormInitial, zoned: boolean): SessionValues {
  return {
    label: initial.label,
    date: initial.date,
    location: initial.location,
    locationUrl: initial.locationUrl,
    startTime: zoned && initial.startTime ? isoToTimeInput(initial.startTime) : "",
    endTime: zoned && initial.endTime ? isoToTimeInput(initial.endTime) : "",
    coverUrl: initial.coverUrl,
    courtFee: initial.courtFee,
    currency: initial.currency || "MYR",
    members: initial.members,
  };
}

/** The session write for the field values. Blank optional fields become null, and the fee takes its currency. */
export function toSessionSave(values: SessionValues, id: string, pin: Pin | null) {
  const { startIso, endIso } = sessionTimes(values.date, values.startTime, values.endTime);
  const fee = values.courtFee.trim() === "" ? null : Number(values.courtFee);
  return {
    id,
    label: values.label,
    date: values.date,
    location: values.location.trim() === "" ? null : values.location,
    locationUrl: values.locationUrl.trim() === "" ? null : values.locationUrl.trim(),
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
    startTime: startIso || null,
    endTime: endIso || null,
    coverUrl: values.coverUrl.trim() === "" ? null : values.coverUrl.trim(),
    courtFee: fee,
    currency: fee === null ? null : values.currency,
  };
}

/** What to do about each field, in place of the contract's developer wording. */
const COPY: Record<string, string> = {
  label: "Give the session a name",
  date: "Pick a date",
  endTime: "Pick an end after the start",
  locationUrl: "Paste a full link, starting with https://",
  coverUrl: "Paste a full link, starting with https://",
  courtFee: "Enter an amount of 0 or more",
};

/** One message per field, keyed by the first path segment of the contract's issue. */
export function sessionProblems(values: SessionValues, id: string): Record<string, string> {
  const checked = SessionSave.safeParse(toSessionSave(values, id, null));
  if (checked.success) return {};
  const out: Record<string, string> = {};
  for (const issue of checked.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = COPY[key] ?? issue.message;
  }
  return out;
}

/** The form schema: the contract's rules with plain-language messages, one per field. */
export function sessionSchema(id: string) {
  return z
    .object({
      label: z.string(),
      date: z.string(),
      location: z.string(),
      locationUrl: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      coverUrl: z.string(),
      courtFee: z.string(),
      currency: z.string(),
      members: z.custom<MemberDraft[]>(),
    })
    .superRefine((values, ctx) => {
      for (const [key, message] of Object.entries(sessionProblems(values, id))) {
        ctx.addIssue({ code: "custom", message, path: [key] });
      }
    });
}

/** True when the fields differ from the saved ones. The pin is not part of this, see `samePin`. */
export function isDirty(values: SessionValues, saved: SessionValues): boolean {
  const { members, ...rest } = values;
  const { members: savedMembers, ...savedRest } = saved;
  return (Object.keys(rest) as (keyof typeof rest)[]).some((key) => rest[key] !== savedRest[key]) || membersChanged(savedMembers, members);
}

/**
 * The pin follows the maps link. Coordinates that came with the saved link stay while the link is
 * unchanged, so editing other fields never drops them.
 */
export function resolvePin(
  linkPlace: Pick<MapsLink, "latitude" | "longitude"> | null,
  locationUrl: string,
  initial: Pick<SessionFormInitial, "locationUrl" | "latitude" | "longitude">,
): Pin | null {
  if (linkPlace?.latitude != null && linkPlace.longitude != null) {
    return { latitude: linkPlace.latitude, longitude: linkPlace.longitude };
  }
  const unchanged = locationUrl.trim() === initial.locationUrl.trim();
  if (unchanged && initial.latitude != null && initial.longitude != null) {
    return { latitude: initial.latitude, longitude: initial.longitude };
  }
  return null;
}

/** True when the pin matches the saved coordinates. A pin found from the link can be saved on its own. */
export function samePin(pin: Pin | null, initial: Pick<SessionFormInitial, "latitude" | "longitude">): boolean {
  return (pin?.latitude ?? null) === initial.latitude && (pin?.longitude ?? null) === initial.longitude;
}
