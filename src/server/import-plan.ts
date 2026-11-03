/**
 * Turns import rows into sessions, matches and games. Pure: no database, so every rule is easy to test.
 * The use case in `imports.ts` looks things up, calls this, and writes the result.
 */
import { MATCH_FORMAT_MAX_GAMES, type ImportPerson, type ImportRow, type Issue, type MatchFormat, type MatchType } from "../contract";
import { checkImportRows, checkMatchPlayers, dateLabel, sameNames, sessionLabelOf } from "../lib/import-rules";

export type PlannedGame = {
  /** Index of the row in the input. */
  row: number;
  /** The game's number in its match, as the sheet gave it. A game on its own is game 1. */
  number: number;
  /** Scores in the order of the match's sides, after swapping a game that was written the other way round. */
  scores: [number, number] | null;
};

export type PlannedMatch = {
  /** The match number from the sheet. Null for a game on its own. */
  key: string | null;
  format: MatchFormat;
  matchType: MatchType;
  /** Who plays on each team, as names. Taken from the match already saved, else from the first game. */
  sides: [string[], string[]];
  games: PlannedGame[];
};

/** A match that is already saved, found by session and sheet name, so a new row joins it. `gameNumbers` are the games it has. */
export type HeldMatch = { sides: [string[], string[]]; gameNumbers: number[]; format: MatchFormat };

export type PlannedSession = {
  date: string;
  label: string;
  /** Index of the first row that lands in this session, to point a failure at. */
  row: number;
  matches: PlannedMatch[];
  /** Rows with no game: videos for the session's pool. */
  videos: number[];
};

/** A game row, once the sides are known to be there. */
type GameRow = ImportRow & { sides: [string[], string[]] };

type Parsed = ImportRow & { session?: string; match?: string };

const rowIssue = (row: number, field: string, message: string): Issue => ({ path: ["rows", row, field], message });

/** How many games make which format. More than five is a free format. */
export function formatFor(games: number): MatchFormat {
  if (games <= 1) return "BO1";
  if (games <= 3) return "BO3";
  if (games <= 5) return "BO5";
  return "FREE";
}

/** One player a side is singles, two is doubles. Gender is not known, so a mixed or odd shape is OTHER. */
export function matchTypeFor(sides: [string[], string[]]): MatchType {
  if (sides[0].length === 1 && sides[1].length === 1) return "MS";
  if (sides[0].length === 2 && sides[1].length === 2) return "MD";
  return "OTHER";
}

/** What finds a saved match again: its session's day and name, and the number the sheet gives it. */
export const heldKey = (date: string, label: string, match: string) => `${date}\u0000${label}\u0000${match}`;

/**
 * Names that point at one person are one person. "Wen" and "Soong" can both be @wensoong, or both the same new
 * guest (the same handle). The first name listed stands for them, and every row is rewritten to use it, so the
 * rest of the import sees one name per person. `index` is where that person sits in the input's `people`.
 */
export function mergeAliases<R extends { sides?: [string[], string[]] }>(
  rows: R[],
  people: ImportPerson[],
): { rows: R[]; people: { person: ImportPerson; index: number }[] } {
  const firstOf = new Map<string, string>();
  const canonOf = new Map<string, string>();
  const kept: { person: ImportPerson; index: number }[] = [];
  people.forEach((person, index) => {
    const who = person.accountId ? `account:${person.accountId}` : `guest:${person.guest?.handle.toLowerCase()}`;
    const first = firstOf.get(who);
    if (first === undefined) {
      firstOf.set(who, person.name);
      canonOf.set(person.name, person.name);
      kept.push({ person, index });
    } else {
      canonOf.set(person.name, first);
    }
  });
  const rename = (names: string[]) => names.map((name) => canonOf.get(name) ?? name);
  return {
    rows: rows.map((row) => (row.sides ? { ...row, sides: [rename(row.sides[0]), rename(row.sides[1])] as [string[], string[]] } : row)),
    people: kept,
  };
}

/** Where a saved game sits, as far as the import needs to tell. */
export type Placement = { sessionId: string; sessionLabel: string; date: string; matchLabel: string; gameNumber: number };

/** A video the actor already has: the games it is in, and the sessions whose pool holds it. */
export type KnownVideo = { id: string; games: Placement[]; pools: string[] };

const placeOf = (p: Placement) =>
  `${p.sessionLabel === dateLabel(p.date) ? p.sessionLabel : `${p.sessionLabel} (${dateLabel(p.date)})`}, ${p.matchLabel}, game ${p.gameNumber}`;

/**
 * What to do with rows whose video is already saved, by where it is. A row never removes a link, so one
 * can finish what an earlier import left.
 * - The row's own game, or the row's session pool for a video with no game: nothing to do, the row is left out.
 * - Saved, but in no game, while the row names a game: the saved video is linked to that game (`reuse`).
 * - Saved, but not in the row's session pool, for a video with no game: the saved video joins that pool (`reuse`).
 * - Saved in a different game: an error that says where, so the person fixes it there and not by guessing.
 * `known` is by row index. `sessionIdOf` is the saved session a row lands in, if there is one.
 */
export function classifyKnownVideos(
  rows: ImportRow[],
  known: Map<number, KnownVideo>,
  sessionIdOf: (row: ImportRow) => string | undefined,
): { skip: Set<number>; reuse: Map<number, string>; issues: Issue[] } {
  const skip = new Set<number>();
  const reuse = new Map<number, string>();
  const issues: Issue[] = [];

  for (const [index, video] of known) {
    const row = rows[index];
    const session = sessionIdOf(row);
    if (!row.sides) {
      if (session !== undefined && video.pools.includes(session)) skip.add(index);
      else reuse.set(index, video.id);
      continue;
    }
    const label = row.match === undefined ? null : `Match ${row.match}`;
    const number = row.game ?? 1;
    const same = video.games.some(
      (g) => g.sessionId === session && g.gameNumber === number && (label === null ? /^Game \d+$/.test(g.matchLabel) : g.matchLabel === label),
    );
    if (same) skip.add(index);
    else if (video.games.length > 0) {
      issues.push(rowIssue(index, "videoUrl", `This video is already in ${placeOf(video.games[0])}. Change it there, or delete that session and import again.`));
    } else reuse.set(index, video.id);
  }
  return { skip, reuse, issues };
}

/**
 * `skip` holds rows left out (the video is already there). `known` holds the names that have a person.
 * `held` holds saved matches by `heldKey`. A row with that match number joins the saved match, so
 * running the same sheet again, or a longer one, adds only what is new.
 * Returns every problem at once.
 */
export function planImport(
  rows: Parsed[],
  skip: Set<number>,
  known: Set<string>,
  held: Map<string, HeldMatch> = new Map(),
): { sessions: PlannedSession[]; issues: Issue[] } {
  // What needs no database: a video twice, a player twice, a game number twice, two sets of players in one match.
  // The names are already merged here, so the last rule can tell two names for one person from two people.
  const issues: Issue[] = [...checkImportRows(rows, undefined, skip), ...checkMatchPlayers(rows, undefined, skip)];

  const sessions = new Map<string, { session: PlannedSession; groups: Map<string, number[]> }>();
  rows.forEach((row, index) => {
    if (skip.has(index)) return;
    const label = sessionLabelOf(row);
    const key = `${row.date}\u0000${label}`;
    const fresh: PlannedSession = { date: row.date, label, row: index, matches: [], videos: [] };
    const entry = sessions.get(key) ?? { session: fresh, groups: new Map<string, number[]>() };
    sessions.set(key, entry);
    if (!row.sides) {
      entry.session.videos.push(index);
      return;
    }

    const names = [...row.sides[0], ...row.sides[1]];
    const missing = names.find((name) => !known.has(name));
    if (missing) issues.push(rowIssue(index, "sides", `${missing} is not linked to a person`));

    // A row with no match number is a game on its own, so it gets a group of its own.
    const group = row.match !== undefined ? `match:${row.match}` : `row:${index}`;
    entry.groups.set(group, [...(entry.groups.get(group) ?? []), index]);
  });

  for (const { session, groups } of sessions.values()) {
    for (const [group, indexes] of groups) {
      const first = rows[indexes[0]] as GameRow;
      const alone = group.startsWith("row:");
      const key = alone ? null : first.match!;
      const saved = key === null ? undefined : held.get(heldKey(session.date, session.label, key));
      const sides: [string[], string[]] = saved ? saved.sides : [first.sides[0], first.sides[1]];

      const games: PlannedGame[] = indexes.map((index) => {
        const row = rows[index] as GameRow;
        const swapped = !sameNames(row.sides[0], sides[0]) && sameNames(row.sides[0], sides[1]) && sameNames(row.sides[1], sides[0]);
        const same = sameNames(row.sides[0], sides[0]) && sameNames(row.sides[1], sides[1]);
        // Rows that differ from the rest of the file were reported above. Here only the saved match can disagree.
        if (saved && !same && !swapped) {
          issues.push(rowIssue(index, "sides", `Different players from match ${row.match}, already saved in this session`));
        }
        // A game on its own is game 1 of its own match. Any other game says which one it is.
        const number = row.game ?? 1;
        if (saved?.gameNumbers.includes(number)) {
          issues.push(rowIssue(index, "game", `Game ${number} of match ${row.match} is already saved in this session`));
        }
        const scores = row.scores ? (swapped ? [row.scores[1], row.scores[0]] : [row.scores[0], row.scores[1]]) : null;
        return { row: index, number, scores: scores as [number, number] | null };
      });

      const total = (saved?.gameNumbers.length ?? 0) + games.length;
      // A saved match keeps its format while it still fits. Otherwise the new count decides.
      const kept = saved && MATCH_FORMAT_MAX_GAMES[saved.format] >= total ? saved.format : undefined;
      const format = kept ?? formatFor(total);

      session.matches.push({ key, format, matchType: matchTypeFor(sides), sides, games });
    }
  }

  // In file order, whichever rule found them.
  issues.sort((a, b) => Number(a.path[1]) - Number(b.path[1]));
  return { sessions: [...sessions.values()].map((s) => s.session), issues };
}
