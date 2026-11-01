/** Parent lookups. Each returns a map from the child id to the ids above it. Missing ids are absent. */
import { unique } from "../core";
import type { Db } from "../db/client";

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
