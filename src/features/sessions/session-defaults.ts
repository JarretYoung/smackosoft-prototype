import type { Account, Role } from "../../contract";
import type { SessionFormInitial } from "./session-values";

/** The parts of a saved session that the form reads. */
type SavedSession = {
  id: string;
  label: string;
  date: string;
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

/**
 * A new session starts from the last one the person ran: the place, the time of day, the length
 * and the fee come across, the name and cover do not. The times stay full timestamps. The form
 * reads them as time of day in the browser's timezone.
 */
export function newSessionInitial({
  id,
  today,
  me,
  last,
}: {
  /** The client picks the id, so a retried save cannot create a second session. */
  id: string;
  today: string;
  me: Account;
  last: SavedSession | null;
}): SessionFormInitial {
  return {
    id,
    label: "",
    date: today,
    location: last?.location ?? "",
    locationUrl: last?.locationUrl ?? "",
    latitude: last?.latitude ?? null,
    longitude: last?.longitude ?? null,
    startTime: last?.startTime ?? "",
    endTime: last?.endTime ?? "",
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
    location: session.location ?? "",
    locationUrl: session.locationUrl ?? "",
    latitude: session.latitude,
    longitude: session.longitude,
    startTime: session.startTime ?? "",
    endTime: session.endTime ?? "",
    coverUrl: session.coverUrl ?? "",
    courtFee: session.courtFee == null ? "" : String(session.courtFee),
    currency: session.currency ?? "MYR",
    members: session.members.map((m) => ({ account: m, role: m.role, isPlayer: m.isPlayer, newGuest: false })),
  };
}
