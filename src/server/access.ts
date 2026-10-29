/**
 * Authorization. The actor's role always comes from the session that owns the data,
 * found by walking up from the ids in the input. Never from the input itself.
 *
 * - No role on the session reads as NOT_FOUND.
 * - A role that is too low is FORBIDDEN.
 * - Removals of things the actor cannot see are skipped, so replays stay safe.
 */
import type { ExpressionBuilder } from "kysely";
import type { Role } from "../contract";
import { stop, type Actor, unique } from "./core";
import type { Db } from "./db/client";
import type { DB } from "./db/types";

type Path = (string | number)[];

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, MANAGER: 2, OWNER: 3 };

const atLeast = (role: Role, min: Role) => RANK[role] >= RANK[min];

export async function rolesIn(db: Db, actor: Actor, sessionIds: string[]): Promise<Map<string, Role>> {
  if (!sessionIds.length) return new Map();
  const rows = await db
    .selectFrom("session_access")
    .select(["session_id", "role_type"])
    .where("account_id", "=", actor.accountId)
    .where("session_id", "in", unique(sessionIds))
    .execute();
  return new Map(rows.map((row) => [row.session_id, row.role_type]));
}

export function requireRole(roles: Map<string, Role>, sessionId: string, min: Role, path: Path) {
  const role = roles.get(sessionId);
  if (!role) stop("NOT_FOUND", path, "Not found");
  if (!atLeast(role, min)) stop("FORBIDDEN", path, `Requires ${min}`);
}

/** OR of (session_id = x and account_id = y) for each pair. */
export const matchesPairs =
  (pairs: { sessionId: string; accountId: string }[]) => (eb: ExpressionBuilder<DB, "session_access">) =>
    eb.or(
      pairs.map((p) =>
        eb.and([eb("session_access.session_id", "=", p.sessionId), eb("session_access.account_id", "=", p.accountId)]),
      ),
    );

// --------------------------------------------------------- parent lookups
// Each returns a map from the child id to the ids above it. Missing ids are absent.

export type Parents = Map<string, { sessionId: string; matchId: string }>;

/** For items that name a session directly. */
export const sessionsOfSessions = (sessionIds: string[]): Parents =>
  new Map(sessionIds.map((id) => [id, { sessionId: id, matchId: "" }]));

export async function sessionsOfMatches(db: Db, matchIds: string[]): Promise<Parents> {
  if (!matchIds.length) return new Map();
  const rows = await db
    .selectFrom("matches")
    .select(["id", "session_id"])
    .where("id", "in", unique(matchIds))
    .execute();
  return new Map(rows.map((r) => [r.id, { matchId: r.id, sessionId: r.session_id }]));
}

export async function sessionsOfTeams(db: Db, teamIds: string[]): Promise<Parents> {
  if (!teamIds.length) return new Map();
  const rows = await db
    .selectFrom("match_teams")
    .innerJoin("matches", "matches.id", "match_teams.match_id")
    .select(["match_teams.id as id", "matches.id as match_id", "matches.session_id as session_id"])
    .where("match_teams.id", "in", unique(teamIds))
    .execute();
  return new Map(rows.map((r) => [r.id, { matchId: r.match_id, sessionId: r.session_id }]));
}

export async function sessionsOfGames(db: Db, gameIds: string[]): Promise<Parents> {
  if (!gameIds.length) return new Map();
  const rows = await db
    .selectFrom("match_games")
    .innerJoin("matches", "matches.id", "match_games.match_id")
    .select(["match_games.id as id", "matches.id as match_id", "matches.session_id as session_id"])
    .where("match_games.id", "in", unique(gameIds))
    .execute();
  return new Map(rows.map((r) => [r.id, { matchId: r.match_id, sessionId: r.session_id }]));
}

// ------------------------------------------------------- bulk authorization

/**
 * Checks `min` on the session above every item. Returns each kept item with its session id.
 * A parent that is missing or invisible fails with NOT_FOUND, or drops the item when `skipHidden`.
 * `field` names the part of the item that points at the parent, for error paths.
 */
async function authorize<T>(
  db: Db,
  actor: Actor,
  items: T[],
  parentId: (item: T) => string,
  parents: Parents,
  min: Role,
  field: string | undefined,
  skipHidden: boolean,
): Promise<{ item: T; sessionId: string }[]> {
  const roles = await rolesIn(db, actor, [...parents.values()].map((p) => p.sessionId));
  const kept: { item: T; sessionId: string }[] = [];
  items.forEach((item, index) => {
    const path = field ? [index, field] : [index];
    const parent = parents.get(parentId(item));
    if (!parent || !roles.has(parent.sessionId)) {
      if (skipHidden) return;
      stop("NOT_FOUND", path, "Not found");
    }
    requireRole(roles, parent.sessionId, min, path);
    kept.push({ item, sessionId: parent.sessionId });
  });
  return kept;
}

/** For saves. Every item names a parent that must exist. Returns session ids in input order. */
export async function requireOnParents<T>(
  db: Db,
  actor: Actor,
  items: T[],
  parentId: (item: T) => string,
  parents: Parents,
  min: Role,
  field?: string,
): Promise<string[]> {
  const kept = await authorize(db, actor, items, parentId, parents, min, field, false);
  return kept.map((k) => k.sessionId);
}

/** For removals. Items whose parent is missing or invisible are dropped. */
export async function removableOnParents<T>(
  db: Db,
  actor: Actor,
  items: T[],
  parentId: (item: T) => string,
  parents: Parents,
  min: Role,
  field?: string,
): Promise<T[]> {
  const kept = await authorize(db, actor, items, parentId, parents, min, field, true);
  return kept.map((k) => k.item);
}
