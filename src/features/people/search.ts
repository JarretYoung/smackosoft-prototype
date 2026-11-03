/** What a person is found by. */
export type Findable = { displayName: string; handle: string };

/**
 * How well a person fits what was typed, 0 being best, or null when they do not fit. A name that is the text
 * beats one that starts with it, which beats one with a word that starts with it, which beats one that holds it.
 * A handle is found the same way, a little behind the name. A leading "@" is ignored.
 */
export function fit(person: Findable, text: string): number | null {
  const wanted = text.trim().toLowerCase();
  if (!wanted) return 0;
  const handle = wanted.replace(/^@/, "");
  const name = person.displayName.toLowerCase();
  const scores: number[] = [];
  if (name === wanted) scores.push(0);
  else if (name.startsWith(wanted)) scores.push(1);
  else if (name.split(/\s+/).some((word) => word.startsWith(wanted))) scores.push(2);
  else if (name.includes(wanted)) scores.push(3);
  if (handle) {
    if (person.handle === handle) scores.push(1);
    else if (person.handle.startsWith(handle)) scores.push(2);
    else if (person.handle.includes(handle)) scores.push(4);
  }
  return scores.length ? Math.min(...scores) : null;
}

/** The people who fit the text, best first. Equal fits keep the order they came in, so a list sorted by use stays so. */
export function rankPeople<T extends Findable>(all: readonly T[], text: string): T[] {
  if (!text.trim()) return [...all];
  return all
    .map((person, index) => ({ person, index, score: fit(person, text) }))
    .filter((entry): entry is { person: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.person);
}
