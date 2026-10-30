import "server-only";
import type { Account } from "@/src/contract";
import { backend } from "@/src/server";
import { unwrap } from "./result";

/**
 * People the viewer is likely to add to a session: teammates they have played with, most games
 * first, then the guests they created. Offered in the member picker so nobody has to remember a handle.
 */
export async function loadPeople(): Promise<Account[]> {
  const [teammates, guests] = await Promise.all([backend.stats.getTeammates(), backend.accounts.listGuests()]);
  const seen = new Set<string>();
  const people: Account[] = [];
  const mates = unwrap(teammates).toSorted((a, b) => b.games - a.games);
  for (const person of [...mates.map((t) => t.account), ...unwrap(guests)]) {
    if (seen.has(person.id)) continue;
    seen.add(person.id);
    const { id, displayName, handle, avatarUrl, isGuest } = person;
    people.push({ id, displayName, handle, avatarUrl, isGuest });
  }
  return people;
}
