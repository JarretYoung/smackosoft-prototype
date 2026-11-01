import { z } from "zod";

export const UUID = z.uuid();

/** Same rule as the database check on accounts.handle. */
export const AccountHandle = z.string().regex(/^[a-z0-9_]{3,30}$/, "3 to 30 characters: a-z, 0-9, _");

export const DateOnly = z.iso.date();

/** Links we store for images and maps. Never `javascript:` or `data:`. */
export const HttpUrl = z.url({ protocol: /^https?$/ });

/** An instant, ISO 8601 with an offset. A session shows it in the session's own timezone. */
export const Timestamp = z.iso.datetime({ offset: true });

/** An IANA zone name such as "Asia/Kuala_Lumpur". The database only checks it is not empty, so this is the real check. */
export const TimeZone = z.string().refine((name) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}, "An IANA timezone name, for example Asia/Kuala_Lumpur");

export const Role = z.enum(["VIEWER", "EDITOR", "MANAGER", "OWNER"]);
export type Role = z.infer<typeof Role>;

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, MANAGER: 2, OWNER: 3 };

/**
 * True when `role` is `min` or higher. The backend uses it to decide.
 * The UI uses it to hide controls only. A button the backend would refuse is a UX bug, never a security one.
 */
export const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];

/** OWNER only comes from creating a session. It cannot be granted. */
export const GrantableRole = z.enum(["VIEWER", "EDITOR", "MANAGER"]);
export type GrantableRole = z.infer<typeof GrantableRole>;

export const MatchType = z.enum(["MS", "WS", "XS", "MD", "WD", "XD", "PRACTICE", "OTHER"]);
export type MatchType = z.infer<typeof MatchType>;

/** How many games decide a match. A one-off game is a `BO1` match with one game. */
export const MatchFormat = z.enum(["BO1", "BO3", "BO5"]);
export type MatchFormat = z.infer<typeof MatchFormat>;

/** The most games a match of this format can hold. */
export const MATCH_FORMAT_MAX_GAMES: Record<MatchFormat, number> = { BO1: 1, BO3: 3, BO5: 5 };

/**
 * Array of items with a unique key per call.
 * A repeated key fails with VALIDATION, pointing at the repeated item.
 */
export const batch = <T extends z.ZodType>(item: T, key: (item: z.output<T>) => string) =>
  z.array(item).check((ctx) => {
    const seen = new Set<string>();
    ctx.value.forEach((value, index) => {
      const k = key(value);
      if (seen.has(k)) {
        ctx.issues.push({
          code: "custom",
          message: "Duplicate key in the same call",
          input: value,
          path: [index],
        });
      }
      seen.add(k);
    });
  });
