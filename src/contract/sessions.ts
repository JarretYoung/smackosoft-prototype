import { z } from "zod";
import { batch, DateOnly, Role, UUID } from "./common";
import type { Match } from "./matches";
import type { Member } from "./members";
import type { Ack, Result } from "./result";

// ------------------------------------------------------------------ inputs

export const SessionSave = z
  .object({
    id: UUID,
    label: z.string().trim().min(1),
    date: DateOnly,
    organiserId: UUID.nullish(),
    location: z.string().trim().min(1).nullish(),
    courtFee: z.number().min(0).max(99_999_999.99).nullish(),
    currency: z.string().regex(/^[A-Z]{3}$/, "ISO 4217 code, for example MYR").nullish(),
  })
  .refine((s) => (s.courtFee == null) === (s.currency == null), {
    message: "Set courtFee and currency together, or neither",
    path: ["currency"],
  });
export const SaveSessionsInput = batch(SessionSave, (s) => s.id);
export type SaveSessionsInput = z.input<typeof SaveSessionsInput>;

export const RemoveSessionsInput = batch(UUID, (id) => id);
export type RemoveSessionsInput = z.input<typeof RemoveSessionsInput>;

/**
 * Sessions the actor can access, ordered by date.
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
  location: string | null;
  matchCount: number;
  myRole: Role;
  members: Member[];
};

export type SessionDetails = {
  id: string;
  label: string;
  date: string;
  location: string | null;
  courtFee: number | null;
  currency: string | null;
  organiserId: string | null;
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
