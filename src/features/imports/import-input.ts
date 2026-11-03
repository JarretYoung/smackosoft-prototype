/** What the import screens work out before and after the backend: who a name is, what to send, what went wrong. */
import type { Account, AppError, ImportGamesInput, ImportRow } from "../../contract";
import { guestHandle } from "../../lib/guest";

/** Who a name from the file is. */
export type Choice =
  | { kind: "account"; account: Account }
  | { kind: "guest"; displayName: string; handle: string };

/**
 * A first guess for each name, so most people only confirm. Someone you already know with the same name
 * (a teammate or a guest you made) wins. Otherwise it is a new guest.
 */
export function defaultChoices(names: string[], known: Account[]): Record<string, Choice> {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return Object.fromEntries(
    names.map((name): [string, Choice] => {
      const match = known.find((p) => same(p.displayName, name)) ?? known.find((p) => same(p.handle, name));
      return [name, match ? { kind: "account", account: match } : { kind: "guest", displayName: name, handle: guestHandle(name) }];
    }),
  );
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
