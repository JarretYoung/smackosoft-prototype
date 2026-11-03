/**
 * Turns import rows into sessions, matches and games. Pure: no database, so every rule is easy to test.
 * The use case in `imports.ts` looks things up, calls this, and writes the result.
 */
import { MATCH_FORMAT_MAX_GAMES, type ImportRow, type Issue, type MatchFormat, type MatchType } from "../contract";
import { sourceKeyOf } from "../lib/video-sources";

export type PlannedGame = {
  /** Index of the row in the input. */
  row: number;
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
  /** Games already in the match when the sheet joins one. New games are numbered after them. */
  heldGames: number;
  games: PlannedGame[];
};

/** A match that is already saved, found by session and sheet number, so a new row joins it. */
export type HeldMatch = { sides: [string[], string[]]; games: number; format: MatchFormat };

export type PlannedSession = {
  date: string;
  label: string;
  matches: PlannedMatch[];
};

type Parsed = ImportRow & { session?: string; match?: string };

const rowIssue = (row: number, field: string, message: string): Issue => ({ path: ["rows", row, field], message });

const sameNames = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-24" as "24 Oct 2026". */
export function dateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The name of a row's session: the one it gives, else its day. */
export const sessionLabelOf = (row: Pick<ImportRow, "date" | "session">) => row.session ?? dateLabel(row.date);

/** What finds a saved match again: its session's day and name, and the number the sheet gives it. */
export const heldKey = (date: string, label: string, match: string) => `${date}\u0000${label}\u0000${match}`;

/** A video that appears twice in a file is a mistake, so say so. The key is the video, however the link is written. */
export const videoKeyOf = (url: string) => sourceKeyOf(url) ?? url;

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
  const issues: Issue[] = [];

  const seenVideo = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = videoKeyOf(row.videoUrl);
    const first = seenVideo.get(key);
    if (first !== undefined) issues.push(rowIssue(index, "videoUrl", `Same video as row ${first + 1}`));
    else seenVideo.set(key, index);
  });

  const sessions = new Map<string, { session: PlannedSession; groups: Map<string, number[]> }>();
  rows.forEach((row, index) => {
    if (skip.has(index)) return;
    const names = [...row.sides[0], ...row.sides[1]];
    const missing = names.find((name) => !known.has(name));
    if (missing) issues.push(rowIssue(index, "sides", `${missing} is not linked to a person`));
    else if (new Set(names).size !== names.length) issues.push(rowIssue(index, "sides", "A player appears twice in one game"));

    const label = sessionLabelOf(row);
    const key = `${row.date}\u0000${label}`;
    const entry = sessions.get(key) ?? { session: { date: row.date, label, matches: [] }, groups: new Map() };
    sessions.set(key, entry);
    // A row with no match number is a game on its own, so it gets a group of its own.
    const group = row.match !== undefined ? `match:${row.match}` : `row:${index}`;
    entry.groups.set(group, [...(entry.groups.get(group) ?? []), index]);
  });

  for (const { session, groups } of sessions.values()) {
    for (const [group, indexes] of groups) {
      const first = rows[indexes[0]];
      const alone = group.startsWith("row:");
      const key = alone ? null : first.match!;
      const saved = key === null ? undefined : held.get(heldKey(session.date, session.label, key));
      const sides: [string[], string[]] = saved ? saved.sides : [first.sides[0], first.sides[1]];

      const games: PlannedGame[] = indexes.map((index) => {
        const row = rows[index];
        const swapped = !sameNames(row.sides[0], sides[0]) && sameNames(row.sides[0], sides[1]) && sameNames(row.sides[1], sides[0]);
        const same = sameNames(row.sides[0], sides[0]) && sameNames(row.sides[1], sides[1]);
        if (!same && !swapped) {
          issues.push(rowIssue(index, "sides", `Different players from the rest of match ${row.match}`));
        }
        const scores = row.scores ? (swapped ? [row.scores[1], row.scores[0]] : [row.scores[0], row.scores[1]]) : null;
        return { row: index, scores: scores as [number, number] | null };
      });

      const named = indexes.filter((index) => rows[index].format !== undefined);
      const explicit = named.length ? rows[named[0]].format : undefined;
      for (const index of named) {
        if (rows[index].format !== explicit) issues.push(rowIssue(index, "format", `Match ${rows[index].match} has two formats`));
      }
      const heldGames = saved?.games ?? 0;
      const total = heldGames + games.length;
      // A saved match keeps its format while it still fits. Otherwise the new count decides.
      const kept = saved && MATCH_FORMAT_MAX_GAMES[saved.format] >= total ? saved.format : undefined;
      const format = explicit ?? kept ?? formatFor(total);
      if (alone && format !== "BO1") {
        issues.push(rowIssue(indexes[0], "format", "A game with no match number is Best of 1"));
      } else if (total > MATCH_FORMAT_MAX_GAMES[format]) {
        const over = indexes[MATCH_FORMAT_MAX_GAMES[format] - heldGames];
        issues.push(rowIssue(over, "format", `Match ${rows[over].match} has more games than ${format} allows`));
      }

      session.matches.push({ key, format, matchType: matchTypeFor(sides), sides, heldGames, games });
    }
  }

  return { sessions: [...sessions.values()].map((s) => s.session), issues };
}
