import type { Match } from "../../contract";

export type FilterPlayer = { id: string; displayName: string; handle: string; avatarUrl: string | null };

/** Everyone who plays in a match, on either side. */
export const matchPlayerIds = (match: Pick<Match, "teams">): string[] => [...new Set(match.teams.flatMap((team) => team.players.map((p) => p.id)))];

/** The players in these matches, the one in the most first, then by name. These are the people to filter by. */
export function playersOf(matches: readonly Pick<Match, "teams">[]): FilterPlayer[] {
  const seen = new Map<string, FilterPlayer & { count: number }>();
  for (const match of matches) {
    const people = new Map(match.teams.flatMap((team) => team.players.map((p) => [p.id, p] as const)));
    for (const [id, person] of people) {
      const found = seen.get(id);
      if (found) found.count++;
      else seen.set(id, { id, displayName: person.displayName, handle: person.handle, avatarUrl: person.avatarUrl, count: 1 });
    }
  }
  return [...seen.values()]
    .toSorted((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName))
    .map(({ id, displayName, handle, avatarUrl }) => ({ id, displayName, handle, avatarUrl }));
}

/** The entries with every one of `chosen` in them. Nothing chosen keeps them all. */
export const withAllOf = <T extends { playerIds: string[] }>(entries: readonly T[], chosen: readonly string[]): T[] =>
  entries.filter((entry) => chosen.every((id) => entry.playerIds.includes(id)));
