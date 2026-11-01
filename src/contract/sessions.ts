import { z } from "zod";
import { batch, DateOnly, HttpUrl, Role, Timestamp, TimeZone, UUID } from "./common";
import type { Match } from "./matches";
import type { Member } from "./members";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

export const SessionSave = z
  .object({
    id: UUID,
    label: z.string().trim().min(1),
    /** The calendar day in `timezone`. */
    date: DateOnly,
    /** Where the session happens. Its times are shown and entered in this zone. */
    timezone: TimeZone,
    location: z.string().trim().min(1).nullish(),
    /** A maps link for the location. */
    locationUrl: HttpUrl.nullish(),
    /** Where the session is, in degrees. Set with longitude or not at all. */
    latitude: z.number().min(-90).max(90).nullish(),
    longitude: z.number().min(-180).max(180).nullish(),
    /** The plan, not what happened. Games carry their own times. */
    startTime: Timestamp.nullish(),
    endTime: Timestamp.nullish(),
    coverUrl: HttpUrl.nullish(),
    courtFee: z.number().min(0).max(99_999_999.99).nullish(),
    currency: z.string().regex(/^[A-Z]{3}$/, "ISO 4217 code, for example MYR").nullish(),
  })
  .refine((s) => (s.courtFee == null) === (s.currency == null), {
    message: "Set courtFee and currency together, or neither",
    path: ["currency"],
  })
  .refine((s) => (s.latitude == null) === (s.longitude == null), {
    message: "Set latitude and longitude together, or neither",
    path: ["longitude"],
  })
  .refine((s) => !s.startTime || !s.endTime || Date.parse(s.endTime) > Date.parse(s.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export const SaveSessionsInput = batch(SessionSave, (s) => s.id);
export type SaveSessionsInput = z.input<typeof SaveSessionsInput>;

export const RemoveSessionsInput = batch(UUID, (id) => id);
export type RemoveSessionsInput = z.input<typeof RemoveSessionsInput>;

/**
 * Sessions the actor can access, ordered by date, then start time (none last), then creation.
 * Anything with a calendar meaning takes a date window. Omitted bounds default to
 * the first day of last month and the last day of next month.
 */
export const ListSessionsInput = z
  .object({
    /** Inclusive. */
    from: DateOnly.optional(),
    /** Inclusive. */
    to: DateOnly.optional(),
  })
  .optional();
export type ListSessionsInput = z.input<typeof ListSessionsInput>;

export const GetSessionInput = z.object({ sessionId: UUID });
export type GetSessionInput = z.input<typeof GetSessionInput>;

// ----------------------------------------------------------------- outputs

export type SessionListItem = {
  id: string;
  label: string;
  date: string;
  timezone: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  coverUrl: string | null;
  /** Games played in the session, across all its matches. */
  gameCount: number;
  myRole: Role;
  members: Member[];
};

export type SessionDetails = {
  id: string;
  label: string;
  date: string;
  timezone: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  locationUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  coverUrl: string | null;
  courtFee: number | null;
  currency: string | null;
  myRole: Role;
  members: Member[];
  /** Ordered by creation time. */
  matches: Match[];
};

// --------------------------------------------------------------- interface

export interface SessionsApi {
  list(input?: ListSessionsInput): Promise<Result<SessionListItem[]>>;
  /** Nests members, matches, teams, players, games and scores. */
  get(input: GetSessionInput): Promise<Result<SessionDetails>>;
  /** Also makes the creator OWNER on insert. */
  save(input: SaveSessionsInput): Promise<Ack>;
  remove(input: RemoveSessionsInput): Promise<Ack>;
}
