import "server-only";
import { Kysely, PostgresDialect, WithSchemaPlugin } from "kysely";
import pg from "pg";
import type { DB } from "./types";

export type Db = Kysely<DB>;

// Return `date` as "YYYY-MM-DD" and `numeric` as a number. Matches the generated types.
// Scoped to this pool, so it does not change parsing for other pg users.
const types = {
  getTypeParser: ((oid: number, format?: "text" | "binary") => {
    if (oid === 1082) return (value: string) => value;
    if (oid === 1700) return (value: string) => Number(value);
    return pg.types.getTypeParser(oid, format as "text");
  }) as pg.CustomTypesConfig["getTypeParser"],
};

const globalForDb = globalThis as unknown as { smackosoftDb?: Db };

/**
 * One pool per server process. Cached on globalThis so dev hot reload does not leak pools.
 * Connects as the `smackosoft_service` role through DATABASE_URL.
 */
export function getDb(): Db {
  if (!globalForDb.smackosoftDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    const pool = new pg.Pool({ connectionString, types });
    // Without a listener, a dropped idle connection crashes the process.
    pool.on("error", (error) => console.error("Idle database client error", error));
    globalForDb.smackosoftDb = new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
      plugins: [new WithSchemaPlugin("smackosoft")],
    });
  }
  return globalForDb.smackosoftDb;
}

/** Closes the pool. Tests call this when a file finishes. */
export async function closeDb(): Promise<void> {
  await globalForDb.smackosoftDb?.destroy();
  globalForDb.smackosoftDb = undefined;
}
