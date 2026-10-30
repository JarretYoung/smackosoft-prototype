import { randomUUID } from "node:crypto";
import pg from "pg";
import { SEEDED } from "./app";

/**
 * Fast path for test prerequisites: insert rows straight into the database instead of driving the UI.
 *
 * Risk: these inserts mirror what src/server/sessions.ts, matches.ts and accounts.ts write, so they
 * can drift from the backend rules. The vitest backend tests in tests/ are the source of truth.
 * Keep the helpers narrow, and drive the UI only in the spec that tests that flow.
 *
 * It connects with DATABASE_URL (the `smackosoft_service` role, as the app does). That role cannot
 * read the auth schema, so seeded users are found by handle, not by email.
 */

let pool: pg.Pool | undefined;

/** One lazy pool per worker. It lets the worker exit when idle, so no teardown is needed. */
function db(): pg.Pool {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // The clear error below covers a missing file.
    }
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Put it in .env.local or the environment.");
  pool = new pg.Pool({ connectionString, allowExitOnIdle: true });
  return pool;
}

async function inTransaction(run: (client: pg.PoolClient) => Promise<void>): Promise<void> {
  const client = await db().connect();
  try {
    await client.query("begin");
    await run(client);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** The account id for a handle, such as a seeded user's. Fails if there is none. */
export async function accountOf(handle: string): Promise<string> {
  const { rows } = await db().query<{ id: string }>(
    "select id from smackosoft.accounts where handle = $1 and not deleted",
    [handle],
  );
  if (!rows[0]) throw new Error(`No account with handle "${handle}". Did you run supabase db reset?`);
  return rows[0].id;
}

/** A guest made by `createdBy`, as saveGuests does. Returns the account id. */
export async function createGuest(createdBy: string, displayName: string): Promise<string> {
  const id = randomUUID();
  const handle = `guest_${displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${id.slice(0, 4)}`;
  await db().query(
    "insert into smackosoft.accounts (id, account_type, display_name, handle, created_by) values ($1, 'GUEST', $2, $3, $4)",
    [id, displayName, handle, createdBy],
  );
  return id;
}

/**
 * A session owned by `ownerId` (the seeded user the specs log in as, by default), as saveSessions does: the session row and an OWNER access row.
 * `date` is "YYYY-MM-DD". `startTime` and `endTime` are ISO timestamps. `members` get VIEWER access.
 */
export async function createSession(input: {
  ownerId?: string;
  label: string;
  date: string;
  /** IANA zone the times belong to. Defaults to Kuala Lumpur, like the seed. */
  timezone?: string;
  startTime?: string;
  endTime?: string;
  members?: string[];
}): Promise<string> {
  const id = randomUUID();
  const ownerId = input.ownerId ?? (await accountOf(SEEDED.handle));
  await inTransaction(async (client) => {
    await client.query(
      "insert into smackosoft.sessions (id, label, date, timezone, start_time, end_time, created_by) values ($1, $2, $3, $4, $5, $6, $7)",
      [id, input.label, input.date, input.timezone ?? "Asia/Kuala_Lumpur", input.startTime ?? null, input.endTime ?? null, ownerId],
    );
    await client.query(
      "insert into smackosoft.session_access (session_id, account_id, role, created_by) values ($1, $2, 'OWNER', $2)",
      [id, ownerId],
    );
    for (const memberId of input.members ?? []) {
      await client.query(
        "insert into smackosoft.session_access (session_id, account_id, role, created_by) values ($1, $2, 'VIEWER', $3)",
        [id, memberId, ownerId],
      );
    }
  });
  return id;
}

/**
 * A doubles match with "Team 1" and "Team 2", as the Add match button makes, and one game per
 * entry of `games`, each holding the two team scores. Returns the match id.
 */
export async function createMatch(input: {
  sessionId: string;
  createdBy: string;
  games?: [number, number][];
}): Promise<string> {
  const matchId = randomUUID();
  const by = input.createdBy;
  await inTransaction(async (client) => {
    await client.query(
      "insert into smackosoft.matches (id, session_id, label, match_type, created_by) values ($1, $2, 'Match 1', 'MD', $3)",
      [matchId, input.sessionId, by],
    );
    const teamIds = [randomUUID(), randomUUID()];
    for (const [index, teamId] of teamIds.entries()) {
      await client.query("insert into smackosoft.match_teams (id, match_id, label, created_by) values ($1, $2, $3, $4)", [
        teamId,
        matchId,
        `Team ${index + 1}`,
        by,
      ]);
    }
    for (const [index, scores] of (input.games ?? []).entries()) {
      const gameId = randomUUID();
      await client.query(
        "insert into smackosoft.match_games (id, match_id, game_number, start_time, end_time, created_by) values ($1, $2, $3, now(), now() + interval '20 minutes', $4)",
        [gameId, matchId, index + 1, by],
      );
      for (const [team, score] of scores.entries()) {
        await client.query(
          "insert into smackosoft.match_game_scores (match_team_id, match_game_id, score, created_by) values ($1, $2, $3, $4)",
          [teamIds[team], gameId, score, by],
        );
      }
    }
  });
  return matchId;
}
