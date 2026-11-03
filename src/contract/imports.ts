/**
 * Bulk import of games with their videos. The one interface every source feeds. A source (a playlist
 * export, a spreadsheet) is an adapter in the frontend that turns its own shape into these rows.
 * Nothing here knows where the rows came from.
 */
import { z } from "zod";
import { AccountHandle, DateOnly, HttpUrl, TimeZone, UUID } from "./common";
import type { Result } from "./result";

/** Most rows one import takes, games and videos together. */
export const IMPORT_MAX_ROWS = 300;

/** A name as the source writes it, such as "Soong". The people list says who it is. */
const Name = z.string().trim().min(1);

/**
 * One game and its video. A row with no `sides` is a video with no game: it goes into the session's pool of
 * footage (a point of view, a practice, a clip) for the person to link later. It may not have a match or scores.
 */
export const ImportRow = z
  .object({
    /** The day of the session, in the import's `timezone`. */
    date: DateOnly,
    /** Splits two sessions on one day. Rows with the same date and session share a session. Defaults to the day, like "24 Oct 2026". */
    session: Name.optional(),
    /**
     * Rows of one session with the same `match` form one match, in row order. Blank is a game on its own.
     * The match is named "Match <match>". Uploading a row with a match number that is already in the
     * session adds its game to that match, so a sheet can grow and be uploaded again.
     */
    match: Name.optional(),
    /** Which game of its match this is, from 1. Gaps are fine: game 3 can arrive before game 2. A game on its own has none. */
    game: z.number().int().min(1).optional(),
    /** The video's name. */
    label: Name,
    videoUrl: HttpUrl,
    /** Who played on each side, as names. One name a side is singles, two is doubles. Leave out for a video with no game. */
    sides: z.tuple([z.array(Name).min(1), z.array(Name).min(1)]).optional(),
    /** One score per side, in the order of `sides`. */
    scores: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
  })
  .refine((row) => row.sides !== undefined || (row.match === undefined && row.game === undefined && row.scores === undefined), {
    message: "A video with no players is not a game, so it has no match, game number or scores",
    path: ["sides"],
  })
  .refine((row) => (row.game === undefined) === (row.match === undefined) || row.sides === undefined, {
    message: "A game in a match needs its game number, and a game on its own has none",
    path: ["game"],
  });
export type ImportRow = z.input<typeof ImportRow>;

/** Who a name is: an existing account, or a new guest the import creates. */
export const ImportPerson = z
  .object({
    name: Name,
    accountId: UUID.optional(),
    guest: z.object({ displayName: Name, handle: AccountHandle }).optional(),
  })
  .refine((p) => (p.accountId == null) !== (p.guest == null), {
    message: "Link to an account or create a guest, not both and not neither",
    path: ["accountId"],
  });
export type ImportPerson = z.input<typeof ImportPerson>;

export const ImportGamesInput = z
  .object({
    /** The zone of every new session. A session that already exists keeps its own. */
    timezone: TimeZone,
    rows: z.array(ImportRow).min(1).max(IMPORT_MAX_ROWS),
    /** One entry per name used in `rows`. */
    people: z.array(ImportPerson),
    /** Runs everything for real and keeps nothing, so the report and every error are exact. */
    dryRun: z.boolean().optional(),
  })
  .check((ctx) => {
    const seen = new Set<string>();
    ctx.value.people.forEach((person, index) => {
      if (seen.has(person.name)) {
        ctx.issues.push({ code: "custom", message: "Name listed twice", input: person, path: ["people", index, "name"] });
      }
      seen.add(person.name);
    });
  });
export type ImportGamesInput = z.input<typeof ImportGamesInput>;

export type ImportReport = {
  dryRun: boolean;
  /** The sessions the rows land in, in the order of the file. */
  sessions: { label: string; date: string; existing: boolean; matches: number; games: number; videos: number }[];
  /** Counts of what was created. `videos` counts every video. `unlinked` is the ones with no game. */
  created: { sessions: number; matches: number; games: number; videos: number; unlinked: number; guests: number };
  /** Rows left out, by index in `rows`. */
  skipped: { row: number; reason: string }[];
  /** The guests this import made, so a later upload of more rows can link to them and not make them again. */
  newGuests: { handle: string; accountId: string }[];
};

export interface ImportsApi {
  /**
   * Creates sessions, matches, games, players, scores and videos from rows, in one transaction.
   * Anything that goes wrong imports nothing. `issues` point at `["rows", index, field]` or `["people", index, field]`,
   * all at once, so a file can be fixed in one pass.
   *
   * - A row whose video the actor already has (same `source_key`) is skipped and reported.
   * - A session is found by the actor's own sessions on that date with that label, or created
   *   with the given timezone and no times.
   * - A row with no `sides` creates only a video, in the pool of its session (created if it does not exist). No game.
   * - A game on its own is a match named "Game <n>", numbered on from the session. It goes last in its session.
   * - A match with a number is named "Match <number>". If the session has that match, the rows join it:
   *   games number on from its last one, and its format grows if it needs to. Its teams must be the same players.
   */
  games(input: ImportGamesInput): Promise<Result<ImportReport>>;
}
