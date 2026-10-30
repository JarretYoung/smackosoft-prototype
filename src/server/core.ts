/**
 * Plumbing shared by every use case. See docs/use-cases.md for the rules it enforces.
 *
 * - `read` and `write` wrap a use case: validate input, resolve the actor, run, map errors.
 * - `write` runs the handler in one transaction. An error rolls everything back.
 * - Handlers throw `Failure` for expected errors. Anything else is a bug and propagates.
 */
import { z } from "zod";
import { fail, ok, type ErrorCode, type Issue, type Result } from "../contract";
import { getDb, type Db } from "./db/client";

export type Actor = { accountId: string };
type Ctx = { db: Db; actor: Actor };
type Path = (string | number)[];

export class Failure extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly issues?: Issue[],
  ) {
    super(code);
  }
}

/** Throws a Failure that points at one input item. */
export function stop(code: ErrorCode, path: Path, message: string): never {
  throw new Failure(code, [{ path, message }]);
}

// -------------------------------------------------------------------- auth

/**
 * Where the signed-in user's id comes from. Replaceable so scripts can run use cases
 * without a browser session.
 */
export const authSource = {
  async userId(): Promise<string | null> {
    const { getClaims } = await import("@/src/lib/supabase/server");
    return (await getClaims())?.sub ?? null;
  },
};

async function resolveActor(db: Db): Promise<Actor | null> {
  const userId = await authSource.userId();
  if (!userId) return null;
  const account = await db
    .selectFrom("accounts")
    .select("id")
    .where("user_id", "=", userId)
    .where("deleted", "=", false)
    .executeTakeFirst();
  return account ? { accountId: account.id } : null;
}

// ----------------------------------------------------------------- wrapping

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  throw new Failure(
    "VALIDATION",
    parsed.error.issues.map((issue) => ({
      path: issue.path.map((key) => (typeof key === "number" ? key : String(key))),
      message: issue.message,
    })),
  );
}

/**
 * Maps database constraint errors to contract errors. Returns null for anything else.
 * The messages are fixed. Postgres `detail` text carries values and table names.
 */
function fromDatabaseError(error: unknown): Result<never> | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23505" || code === "23503") return fail("CONFLICT", [{ path: [], message: "Conflicts with existing data" }]);
  if (code === "23514" || code === "22P02") return fail("VALIDATION", [{ path: [], message: "Invalid value" }]);
  return null;
}

export async function guard<T>(run: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await run());
  } catch (error) {
    if (error instanceof Failure) return fail(error.code, error.issues);
    const mapped = fromDatabaseError(error);
    if (mapped) return mapped;
    throw error;
  }
}

async function actorOrStop(db: Db): Promise<Actor> {
  const actor = await resolveActor(db);
  if (!actor) throw new Failure("UNAUTHENTICATED");
  return actor;
}

type Handler<S extends z.ZodType, T> = (ctx: Ctx, input: z.output<S>) => Promise<T>;

/** Schema for use cases that take no input. */
export const NoInput = z.void();

/** A read use case. */
export function read<S extends z.ZodType, T>(
  schema: S,
  handler: Handler<S, T>,
): (input: z.input<S>) => Promise<Result<T>> {
  return (input) =>
    guard(async () => {
      const parsed = parse(schema, input);
      const db = getDb();
      return handler({ db, actor: await actorOrStop(db) }, parsed);
    });
}

/** A write use case. One transaction. An empty array is a successful no-op. */
export function write<S extends z.ZodType>(
  schema: S,
  handler: Handler<S, void>,
): (input: z.input<S>) => Promise<Result<void>> {
  return (input) =>
    guard(async () => {
      const parsed = parse(schema, input);
      if (Array.isArray(parsed) && parsed.length === 0) return;
      const db = getDb();
      const actor = await actorOrStop(db);
      await db.transaction().execute((tx) => handler({ db: tx, actor }, parsed));
    });
}

/** A write use case that returns a value. One transaction. */
export function act<S extends z.ZodType, T>(
  schema: S,
  handler: Handler<S, T>,
): (input: z.input<S>) => Promise<Result<T>> {
  return (input) =>
    guard(async () => {
      const parsed = parse(schema, input);
      const db = getDb();
      const actor = await actorOrStop(db);
      return db.transaction().execute((tx) => handler({ db: tx, actor }, parsed));
    });
}

// ------------------------------------------------------------------ helpers

/** Throws CONFLICT for every input item whose key was not written. */
export function expectAll<T>(items: T[], written: Set<string>, key: (item: T) => string, message: string) {
  const issues = items.flatMap((item, index) =>
    written.has(key(item)) ? [] : [{ path: [index], message }],
  );
  if (issues.length) throw new Failure("CONFLICT", issues);
}

export const unique = <T>(values: T[]) => [...new Set(values)];
