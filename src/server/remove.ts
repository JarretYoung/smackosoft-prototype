/**
 * Hard deletes. The schema has no ON DELETE CASCADE below sessions, so each level
 * removes what hangs off it first. Videos are never deleted. Only their pool and game links go.
 * Callers run these inside a transaction and have already authorized the ids.
 */
import { unique } from "./core";
import type { Db } from "./db/client";

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

export async function removeGameRows(db: Db, gameIds: string[]) {
  if (!gameIds.length) return;
  await db.deleteFrom("match_game_highlights").where("match_game_id", "in", gameIds).execute();
  await db.deleteFrom("match_game_scores").where("match_game_id", "in", gameIds).execute();
  await db.deleteFrom("video_games").where("match_game_id", "in", gameIds).execute();
  await db.deleteFrom("match_games").where("id", "in", gameIds).execute();
}

export async function removePlayerRows(db: Db, playerIds: string[]) {
  if (!playerIds.length) return;
  await db.deleteFrom("match_game_highlights").where("match_player_id", "in", playerIds).execute();
  await db.deleteFrom("match_players").where("id", "in", playerIds).execute();
}

export async function removeTeamRows(db: Db, teamIds: string[]) {
  if (!teamIds.length) return;
  const players = await db.selectFrom("match_players").select("id").where("match_team_id", "in", teamIds).execute();
  await removePlayerRows(db, ids(players));
  await db.deleteFrom("match_game_scores").where("match_team_id", "in", teamIds).execute();
  await db.deleteFrom("match_teams").where("id", "in", teamIds).execute();
}

export async function removeMatchRows(db: Db, matchIds: string[]) {
  if (!matchIds.length) return;
  const games = await db.selectFrom("match_games").select("id").where("match_id", "in", matchIds).execute();
  await removeGameRows(db, ids(games));
  const teams = await db.selectFrom("match_teams").select("id").where("match_id", "in", matchIds).execute();
  await removeTeamRows(db, ids(teams));
  await db.deleteFrom("matches").where("id", "in", matchIds).execute();
}

export async function removeSessionRows(db: Db, sessionIds: string[]) {
  const sessions = unique(sessionIds);
  if (!sessions.length) return;
  const matches = await db.selectFrom("matches").select("id").where("session_id", "in", sessions).execute();
  await removeMatchRows(db, ids(matches));
  await db.deleteFrom("video_sessions").where("session_id", "in", sessions).execute();
  await db.deleteFrom("session_access").where("session_id", "in", sessions).execute();
  await db.deleteFrom("sessions").where("id", "in", sessions).execute();
}
