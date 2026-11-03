import type { ImportRow } from "../../contract";
import { dateLabel } from "../../lib/import-rules";
import type { Findable } from "../people/search";

/** Whether two words are the same but for one letter added, dropped or changed. */
function oneOff(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/**
 * How likely a person is who a name from the file means, 0 being surest and 3 not at all.
 * "Nad" is a whole word of "Nad Ahmad". "Gar" begins "Garret". "Zaq" is one letter from "Zaaq".
 * It runs before anything is typed, so the person usually only has to tap.
 */
export function likeness(token: string, person: Findable): number {
  const t = token.toLowerCase();
  const words = person.displayName.toLowerCase().split(/\s+/).filter(Boolean);
  if (person.handle === t || words.includes(t)) return 0;
  if (words.some((word) => word.startsWith(t) || (word.length >= 3 && t.startsWith(word))) || person.handle.startsWith(t)) return 1;
  // One letter off is a typo in a long name, but two different short names ("Far" and "Gar").
  if (words.some((word) => word.length >= 3 && t.length >= 3 && Math.max(word.length, t.length) >= 4 && oneOff(word, t))) return 2;
  return 3;
}

/** The people most like the name first. Equal ones keep their order, so a list sorted by use stays so. */
export function byLikeness<T extends Findable>(people: readonly T[], token: string): T[] {
  return people
    .map((person, index) => ({ person, index, score: likeness(token, person) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.person);
}

export type NameFacts = {
  games: number;
  /** The first and last day the name plays, as dates. Null when the name has no game. */
  first: string | null;
  last: string | null;
  /** Who it plays with, and against, most often. Up to three each. */
  withNames: string[];
  againstNames: string[];
};

/** What the file says about a name, to help the person know who it is. */
export function nameFacts(rows: readonly ImportRow[], name: string): NameFacts {
  const together = new Map<string, number>();
  const against = new Map<string, number>();
  const days: string[] = [];
  let games = 0;
  for (const row of rows) {
    if (!row.sides) continue;
    const side = row.sides.findIndex((names) => names.includes(name));
    if (side === -1) continue;
    games++;
    days.push(row.date);
    for (const mate of row.sides[side]) if (mate !== name) together.set(mate, (together.get(mate) ?? 0) + 1);
    for (const rival of row.sides[1 - side]) against.set(rival, (against.get(rival) ?? 0) + 1);
  }
  const top = (counts: Map<string, number>) =>
    [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([who]) => who);
  days.sort();
  return { games, first: days[0] ?? null, last: days.at(-1) ?? null, withNames: top(together), againstNames: top(against) };
}

/** "Apr 2024 to Oct 2026", or one month when it is the same. */
export function playedBetween(facts: Pick<NameFacts, "first" | "last">): string {
  if (!facts.first || !facts.last) return "";
  const month = (date: string) => dateLabel(date).replace(/^\d+ /, "");
  const [from, to] = [month(facts.first), month(facts.last)];
  return from === to ? from : `${from} to ${to}`;
}

/** "Nad", "Nad and Ian", "Nad, Ian and Jus". */
export function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
