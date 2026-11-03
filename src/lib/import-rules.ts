/**
 * Rules about the rows of one import that need no database. The file step runs them with line numbers, and the
 * server planner runs them again, so the backend never trusts a file the screen did not check. One copy, so
 * the two cannot drift.
 */
import type { ImportRow, Issue } from "../contract";
import { sourceKeyOf } from "./video-sources";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-24" as "24 Oct 2026". */
export function dateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The name of a row's session: the one it gives, else its day. */
export const sessionLabelOf = (row: Pick<ImportRow, "date" | "session">) => row.session ?? dateLabel(row.date);

/** The same people, in any order. */
export const sameNames = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("\n") === [...b].sort().join("\n");

/** The same two teams, either side first. */
export const samePlayers = (a: [string[], string[]], b: [string[], string[]]) =>
  (sameNames(a[0], b[0]) && sameNames(a[1], b[1])) || (sameNames(a[0], b[1]) && sameNames(a[1], b[0]));

/** A video that appears twice in a file is a mistake, so say so. The key is the video, however the link is written. */
export const videoKeyOf = (url: string) => sourceKeyOf(url) ?? url;

type Where = (index: number) => string;
const rowWhere: Where = (index) => `row ${index + 1}`;
const issueAt = (row: number, field: string, message: string): Issue => ({ path: ["rows", row, field], message });
const matchKey = (row: ImportRow) => `${row.date}\u0000${sessionLabelOf(row)}\u0000${row.match}`;

/**
 * What a file must satisfy whatever the names turn out to mean: the same video twice, the same token twice in one
 * game, a game number twice in one match. Every problem comes back at once, as `["rows", index, field]`.
 * `where` names a row in a message, such as "line 7" for a file or "row 7" for the backend. `skip` holds rows left
 * out, which no rule holds to account except the one about the same video twice.
 */
export function checkImportRows(rows: readonly ImportRow[], where: Where = rowWhere, skip: ReadonlySet<number> = new Set()): Issue[] {
  const issues: Issue[] = [];

  const videos = new Map<string, number>();
  rows.forEach((row, index) => {
    const key = videoKeyOf(row.videoUrl);
    const first = videos.get(key);
    if (first === undefined) videos.set(key, index);
    else issues.push(issueAt(index, "videoUrl", `Same video as ${where(first)}`));
  });

  const games = new Map<string, number>();
  rows.forEach((row, index) => {
    if (skip.has(index) || !row.sides) return;
    const names = [...row.sides[0], ...row.sides[1]];
    if (new Set(names).size !== names.length) {
      issues.push(issueAt(index, "sides", "A player appears twice in one game. Two names for one person count as the same player."));
    }
    if (row.match === undefined || row.game === undefined) return;

    const key = `${matchKey(row)}\u0000${row.game}`;
    const earlier = games.get(key);
    if (earlier === undefined) games.set(key, index);
    else issues.push(issueAt(index, "game", `Game ${row.game} of match ${row.match} is also ${where(earlier)}`));
  });
  return issues;
}

/**
 * One match name in one session is one pair of teams. This needs names that already mean people, because two
 * names can be one person ("Wen" and "Soong"), so it runs after the names are linked and merged, never on a raw file.
 */
export function checkMatchPlayers(rows: readonly ImportRow[], where: Where = rowWhere, skip: ReadonlySet<number> = new Set()): Issue[] {
  const issues: Issue[] = [];
  const leads = new Map<string, number>();
  rows.forEach((row, index) => {
    if (skip.has(index) || !row.sides || row.match === undefined) return;
    const key = matchKey(row);
    const lead = leads.get(key);
    if (lead === undefined) leads.set(key, index);
    else if (!samePlayers(rows[lead].sides!, row.sides)) {
      issues.push(issueAt(index, "sides", `Different players from the rest of match ${row.match} (${where(lead)})`));
    }
  });
  return issues;
}
