/** What the import screens work out before and after the backend: who a name is, what to send, what went wrong. */
import type { Account, AppError, ImportGamesInput, ImportRow } from "../../contract";
import { guestHandle } from "../../lib/guest";

/** Who a name from the file is. */
export type Choice =
  | { kind: "account"; account: Account }
  | { kind: "guest"; displayName: string; handle: string };

/**
 * A first guess for each name, so most people only confirm. Someone you already know with the same name
 * (a teammate or a guest you made) wins. Otherwise it is a new guest. Names in `previous` keep their choice.
 */
export function defaultChoices(names: string[], known: Account[], previous: Record<string, Choice> = {}): Record<string, Choice> {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return Object.fromEntries(
    names.map((name): [string, Choice] => {
      // What the person already chose stays. A name that left with its file is gone with its choice.
      if (previous[name]) return [name, previous[name]];
      const match = known.find((p) => same(p.displayName, name)) ?? known.find((p) => same(p.handle, name));
      return [name, match ? { kind: "account", account: match } : { kind: "guest", displayName: name, handle: guestHandle(name) }];
    }),
  );
}

/** Who a choice is, so two names that mean one person can be told. A guest is known by its handle, as the backend does. */
const personOf = (choice: Choice) => (choice.kind === "account" ? `account:${choice.account.id}` : `guest:${choice.handle.toLowerCase()}`);

/** One person the file's names resolve to, with every name in the file that means them. */
export type Resolved = {
  /** The names in the file, the one with the most games first. */
  names: string[];
  games: number;
  displayName: string;
  avatarUrl: string | null;
  /** Null for a new guest, which has no account yet. */
  account: Account | null;
  handle: string;
};

/** The people the names mean, most games first. Names that mean one person share one entry. */
export function whoIsWho(names: string[], choices: Record<string, Choice>, games: (name: string) => number): Resolved[] {
  const people = new Map<string, Resolved>();
  for (const name of names) {
    const choice = choices[name];
    if (!choice) continue;
    const key = personOf(choice);
    const found = people.get(key);
    if (found) {
      found.names.push(name);
      found.games += games(name);
    } else if (choice.kind === "account") {
      const { displayName, avatarUrl, handle } = choice.account;
      people.set(key, { names: [name], games: games(name), displayName, avatarUrl, account: choice.account, handle });
    } else {
      people.set(key, { names: [name], games: games(name), displayName: choice.displayName, avatarUrl: null, account: null, handle: choice.handle });
    }
  }
  return [...people.values()]
    .map((person) => ({ ...person, names: person.names.toSorted((a, b) => games(b) - games(a)) }))
    .toSorted((a, b) => b.games - a.games);
}

/** New guests picked for the other names, one per handle, so a name can be set to the same guest. */
export function guestsFromFile(name: string, names: string[], choices: Record<string, Choice>) {
  const seen = new Map<string, { name: string; choice: Extract<Choice, { kind: "guest" }> }>();
  for (const other of names) {
    const choice = choices[other];
    if (other !== name && choice?.kind === "guest" && !seen.has(personOf(choice))) seen.set(personOf(choice), { name: other, choice });
  }
  return [...seen.values()];
}

/** The backend input for the rows and what each name means. `names` fixes the order of `people`. */
export function importInput(
  rows: ImportRow[],
  names: string[],
  choices: Record<string, Choice>,
  timezone: string,
  dryRun: boolean,
): ImportGamesInput {
  return {
    timezone,
    rows,
    dryRun,
    people: names.map((name) => {
      const choice = choices[name];
      return choice.kind === "account"
        ? { name, accountId: choice.account.id }
        : { name, guest: { displayName: choice.displayName, handle: choice.handle } };
    }),
  };
}

/**
 * After a file made some guests, the next file links its names to those accounts, so no guest is made twice.
 * A name whose choice was a new guest with a handle in `made` becomes that account. Every other choice stays.
 */
export function applyNewGuests(choices: Record<string, Choice>, made: { handle: string; accountId: string }[]): Record<string, Choice> {
  const idOf = new Map(made.map((guest) => [guest.handle.toLowerCase(), guest.accountId]));
  return Object.fromEntries(
    Object.entries(choices).map(([name, choice]): [string, Choice] => {
      const id = choice.kind === "guest" ? idOf.get(choice.handle.toLowerCase()) : undefined;
      if (choice.kind !== "guest" || id === undefined) return [name, choice];
      return [name, { kind: "account", account: { id, displayName: choice.displayName, handle: choice.handle.toLowerCase(), avatarUrl: null, isGuest: true } }];
    }),
  );
}

/** One line per problem the backend found, in words about the file. */
export function describeProblems(error: AppError, lines: number[], names: string[]): string[] {
  const issues = error.issues ?? [];
  if (!issues.length) return ["The import did not go through. Try again."];
  return issues.map((issue) => {
    const [kind, index, field] = issue.path;
    if (kind === "rows" && typeof index === "number") return `Line ${lines[index] ?? index + 2}: ${issue.message}`;
    if (kind === "people" && typeof index === "number") {
      const who = names[index] ?? "A name";
      return field === "guest" ? `${who}: ${issue.message}. Pick another handle.` : `${who}: ${issue.message}`;
    }
    return issue.message;
  });
}
