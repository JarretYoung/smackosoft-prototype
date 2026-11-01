import type { Account, Role } from "../../contract";
import { isoToTime } from "../../lib/zoned";
import type { SessionFormInitial } from "./session-values";

/** The parts of a saved session that the form reads. */
type SavedSession = {
  id: string;
  label: string;
  date: string;
  timezone: string;
  location: string | null;
  locationUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  startTime: string | null;
  endTime: string | null;
  coverUrl: string | null;
  courtFee: number | null;
  currency: string | null;
  members: (Account & { role: Role; isPlayer: boolean })[];
};

/** The clock reading "HH:mm" of an instant in a zone, or "" when there is none. */
const clockIn = (iso: string | null | undefined, zone: string | undefined) => (iso && zone ? isoToTime(iso, zone) : "");

/**
 * A new session starts from the last one the person ran: the place, the time of day, the length
 * and the fee come across, the name and cover do not. The times carry over as clock readings, so
 * "8 pm" stays 8 pm in the new session's zone, whatever zone the last one was in.
 * The server cannot know the browser's zone or day, so `timezone` and `today` are placeholders there
 * and the form replaces them once the browser has taken over.
 */
export function newSessionInitial({
  id,
  today,
  timezone,
  me,
  last,
}: {
  /** The client picks the id, so a retried save cannot create a second session. */
  id: string;
  today: string;
  timezone: string;
  me: Account;
  last: SavedSession | null;
}): SessionFormInitial {
  return {
    id,
    label: "",
    date: today,
    timezone,
    location: last?.location ?? "",
    locationUrl: last?.locationUrl ?? "",
    latitude: last?.latitude ?? null,
    longitude: last?.longitude ?? null,
    startTime: clockIn(last?.startTime, last?.timezone),
    endTime: clockIn(last?.endTime, last?.timezone),
    coverUrl: "",
    courtFee: last?.courtFee != null ? String(last.courtFee) : "",
    currency: last?.currency ?? "MYR",
    members: [{ account: me, role: "OWNER", isPlayer: false, newGuest: false }],
  };
}

export function editSessionInitial(session: SavedSession): SessionFormInitial {
  return {
    id: session.id,
    label: session.label,
    date: session.date,
    timezone: session.timezone,
    location: session.location ?? "",
    locationUrl: session.locationUrl ?? "",
    latitude: session.latitude,
    longitude: session.longitude,
    startTime: clockIn(session.startTime, session.timezone),
    endTime: clockIn(session.endTime, session.timezone),
    coverUrl: session.coverUrl ?? "",
    courtFee: session.courtFee == null ? "" : String(session.courtFee),
    currency: session.currency ?? "MYR",
    members: session.members.map((m) => ({ account: m, role: m.role, isPlayer: m.isPlayer, newGuest: false })),
  };
}
