import { sql } from "kysely";
import {
  RemoveGameScoresInput,
  RemoveGamesInput,
  RemoveMatchesInput,
  RemoveMatchPlayersInput,
  RemoveTeamsInput,
  SaveGameScoresInput,
  SaveGamesInput,
  SaveMatchesInput,
  SaveMatchPlayersInput,
  SaveTeamsInput,
} from "../contract";
import {
  matchesPairs,
  removableOnParents,
  requireOnParents,
  requireRole,
  rolesIn,
  sessionsOfGames,
  sessionsOfMatches,
  sessionsOfSessions,
  sessionsOfTeams,
} from "./access";
import { expectAll, stop, unique, write } from "./core";
import type { Db } from "./db/client";
import { removeGameRows, removeMatchRows, removePlayerRows, removeTeamRows } from "./remove";

/**
 * Serialises writers of the same matches until the transaction ends. Rules that count
 * teams or players read, then write, so two parallel calls would both pass. Taking
 * this lock first makes the second call count after the first has committed.
 * Ids are locked in sorted order so two calls cannot deadlock.
 */
async function lockMatches(db: Db, matchIds: string[]) {
  await db.selectFrom("matches").select("id").where("id", "in", unique(matchIds)).orderBy("id").forUpdate().execute();
}

// ------------------------------------------------------------------ matches

export const saveMatches = write(SaveMatchesInput, async ({ db, actor }, items) => {
  const sessions = sessionsOfSessions(items.map((m) => m.sessionId));
  await requireOnParents(db, actor, items, (m) => m.sessionId, sessions, "EDITOR", "sessionId");

  const written = await db
    .insertInto("matches")
    .values(
      items.map((m) => ({
        id: m.id,
        session_id: m.sessionId,
        label: m.label,
        match_type: m.matchType,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          label: eb.ref("excluded.label"),
          match_type: eb.ref("excluded.match_type"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        // Never move a match to another session.
        .where((eb) => eb("matches.session_id", "=", eb.ref("excluded.session_id"))),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (m) => m.id, "Id already used elsewhere");
});

export const removeMatches = write(RemoveMatchesInput, async ({ db, actor }, matchIds) => {
  const lookup = await sessionsOfMatches(db, matchIds);
  const allowed = await removableOnParents(db, actor, matchIds, (id) => id, lookup, "EDITOR", "id");
  await removeMatchRows(db, allowed);
});

// -------------------------------------------------------------------- teams

export const saveTeams = write(SaveTeamsInput, async ({ db, actor }, items) => {
  const lookup = await sessionsOfMatches(db, items.map((t) => t.matchId));
  await requireOnParents(db, actor, items, (t) => t.matchId, lookup, "EDITOR", "matchId");

  // A match has one or two teams. The database does not enforce it, so count here.
  await lockMatches(db, items.map((t) => t.matchId));
  const existing = await db
    .selectFrom("match_teams")
    .select(["id", "match_id"])
    .where("match_id", "in", unique(items.map((t) => t.matchId)))
    .execute();
  const teamsOf = new Map<string, Set<string>>();
  for (const team of existing) teamsOf.set(team.match_id, (teamsOf.get(team.match_id) ?? new Set()).add(team.id));
  items.forEach((team, index) => {
    const known = teamsOf.get(team.matchId) ?? new Set<string>();
    known.add(team.id);
    teamsOf.set(team.matchId, known);
    if (known.size > 2) stop("CONFLICT", [index, "matchId"], "A match has at most two teams");
  });

  const written = await db
    .insertInto("match_teams")
    .values(items.map((t) => ({ id: t.id, match_id: t.matchId, label: t.label, created_by: actor.accountId })))
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          label: eb.ref("excluded.label"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        .where((eb) => eb("match_teams.match_id", "=", eb.ref("excluded.match_id"))),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (t) => t.id, "Id already used elsewhere");
});

export const removeTeams = write(RemoveTeamsInput, async ({ db, actor }, teamIds) => {
  const lookup = await sessionsOfTeams(db, teamIds);
  const allowed = await removableOnParents(db, actor, teamIds, (id) => id, lookup, "EDITOR", "id");
  if (!allowed.length) return;

  // A match keeps at least one team. Delete the match to remove them all.
  const matchIds = unique(allowed.map((id) => lookup.get(id)!.matchId));
  await lockMatches(db, matchIds);
  const counts = await db
    .selectFrom("match_teams")
    .select(["match_id", (eb) => eb.fn.countAll<string>().as("count")])
    .where("match_id", "in", matchIds)
    .groupBy("match_id")
    .execute();
  const left = new Map(counts.map((c) => [c.match_id, Number(c.count)]));
  for (const id of allowed) {
    const matchId = lookup.get(id)!.matchId;
    left.set(matchId, (left.get(matchId) ?? 0) - 1);
  }
  teamIds.forEach((id, index) => {
    const ref = lookup.get(id);
    if (ref && allowed.includes(id) && (left.get(ref.matchId) ?? 0) < 1) {
      stop("CONFLICT", [index], "A match keeps at least one team");
    }
  });

  await removeTeamRows(db, allowed);
});

// ------------------------------------------------------------------ players

export const saveMatchPlayers = write(SaveMatchPlayersInput, async ({ db, actor }, items) => {
  const lookup = await sessionsOfTeams(db, items.map((p) => p.teamId));
  const sessionIds = await requireOnParents(db, actor, items, (p) => p.teamId, lookup, "EDITOR", "teamId");

  // An account plays for one team per match. Check inside the call, then against saved players.
  const matchOf = (p: { teamId: string }) => lookup.get(p.teamId)!.matchId;
  await lockMatches(db, items.map(matchOf));
  const teamByMatchAccount = new Map<string, string>();
  items.forEach((p, index) => {
    const slot = `${matchOf(p)}:${p.accountId}`;
    const team = teamByMatchAccount.get(slot);
    if (team && team !== p.teamId) stop("CONFLICT", [index, "accountId"], "Already on the other team of this match");
    teamByMatchAccount.set(slot, p.teamId);
  });
  const saved = await db
    .selectFrom("match_players")
    .innerJoin("match_teams", "match_teams.id", "match_players.match_team_id")
    .select(["match_teams.match_id as match_id", "match_players.match_team_id as team_id", "match_players.account_id as account_id"])
    .where("match_teams.match_id", "in", unique(items.map(matchOf)))
    .where("match_players.account_id", "in", unique(items.map((p) => p.accountId)))
    .execute();
  items.forEach((p, index) => {
    const clash = saved.find((s) => s.match_id === matchOf(p) && s.account_id === p.accountId && s.team_id !== p.teamId);
    if (clash) stop("CONFLICT", [index, "accountId"], "Already on the other team of this match");
  });

  await db
    .insertInto("match_players")
    .values(items.map((p) => ({ match_team_id: p.teamId, account_id: p.accountId, created_by: actor.accountId })))
    .onConflict((oc) => oc.columns(["match_team_id", "account_id"]).doNothing())
    .execute();

  // A player is always a member. Adding a new member takes MANAGER, as in saveMembers.
  // Never lowers an existing role.
  const pairs = [
    ...new Map(
      items.map((p, index) => [
        `${sessionIds[index]}:${p.accountId}`,
        { sessionId: sessionIds[index], accountId: p.accountId, index },
      ]),
    ).values(),
  ];
  const current = await db
    .selectFrom("session_access")
    .select(["session_id", "account_id"])
    .where(matchesPairs(pairs))
    .execute();
  const isMember = new Set(current.map((r) => `${r.session_id}:${r.account_id}`));
  const fresh = pairs.filter((m) => !isMember.has(`${m.sessionId}:${m.accountId}`));
  if (fresh.length) {
    const roles = await rolesIn(db, actor, fresh.map((m) => m.sessionId));
    fresh.forEach((m) => requireRole(roles, m.sessionId, "MANAGER", [m.index, "accountId"]));
    await db
      .insertInto("session_access")
      .values(
        fresh.map((m) => ({
          session_id: m.sessionId,
          account_id: m.accountId,
          role_type: "VIEWER" as const,
          created_by: actor.accountId,
        })),
      )
      .onConflict((oc) => oc.columns(["session_id", "account_id"]).doNothing())
      .execute();
  }
});

export const removeMatchPlayers = write(RemoveMatchPlayersInput, async ({ db, actor }, items) => {
  const lookup = await sessionsOfTeams(db, items.map((p) => p.teamId));
  const allowed = await removableOnParents(db, actor, items, (p) => p.teamId, lookup, "EDITOR", "teamId");
  if (!allowed.length) return;
  const rows = await db
    .selectFrom("match_players")
    .select("id")
    .where((eb) =>
      eb.or(
        allowed.map((p) =>
          eb.and([eb("match_team_id", "=", p.teamId), eb("account_id", "=", p.accountId)]),
        ),
      ),
    )
    .execute();
  await removePlayerRows(db, rows.map((r) => r.id));
});

// -------------------------------------------------------------------- games

export const saveGames = write(SaveGamesInput, async ({ db, actor }, items) => {
  const lookup = await sessionsOfMatches(db, items.map((g) => g.matchId));
  await requireOnParents(db, actor, items, (g) => g.matchId, lookup, "EDITOR", "matchId");

  const written = await db
    .insertInto("match_games")
    .values(
      items.map((g) => ({
        id: g.id,
        match_id: g.matchId,
        game_number: g.gameNumber,
        start_time: g.startTime,
        end_time: g.endTime,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc
        .column("id")
        .doUpdateSet((eb) => ({
          game_number: eb.ref("excluded.game_number"),
          start_time: eb.ref("excluded.start_time"),
          end_time: eb.ref("excluded.end_time"),
          updated_at: sql`now()`,
          updated_by: actor.accountId,
        }))
        .where((eb) => eb("match_games.match_id", "=", eb.ref("excluded.match_id"))),
    )
    .returning("id")
    .execute();
  expectAll(items, new Set(written.map((r) => r.id)), (g) => g.id, "Id already used elsewhere");
});

export const removeGames = write(RemoveGamesInput, async ({ db, actor }, gameIds) => {
  const lookup = await sessionsOfGames(db, gameIds);
  const allowed = await removableOnParents(db, actor, gameIds, (id) => id, lookup, "EDITOR", "id");
  await removeGameRows(db, allowed);
});

// ------------------------------------------------------------------- scores

export const saveGameScores = write(SaveGameScoresInput, async ({ db, actor }, items) => {
  // Team and game must share a match, so authorizing the team covers the game.
  const teams = await sessionsOfTeams(db, items.map((s) => s.teamId));
  await requireOnParents(db, actor, items, (s) => s.teamId, teams, "EDITOR", "teamId");
  const games = await sessionsOfGames(db, items.map((s) => s.gameId));
  items.forEach((s, index) => {
    const game = games.get(s.gameId);
    if (!game) stop("NOT_FOUND", [index, "gameId"], "Not found");
    if (game.matchId !== teams.get(s.teamId)!.matchId) {
      stop("CONFLICT", [index, "gameId"], "Team and game belong to different matches");
    }
  });

  await db
    .insertInto("match_game_scores")
    .values(
      items.map((s) => ({
        match_team_id: s.teamId,
        match_game_id: s.gameId,
        score: s.score,
        created_by: actor.accountId,
      })),
    )
    .onConflict((oc) =>
      oc.columns(["match_team_id", "match_game_id"]).doUpdateSet((eb) => ({
        score: eb.ref("excluded.score"),
        updated_at: sql`now()`,
        updated_by: actor.accountId,
      })),
    )
    .execute();
});

export const removeGameScores = write(RemoveGameScoresInput, async ({ db, actor }, items) => {
  const teams = await sessionsOfTeams(db, items.map((s) => s.teamId));
  const allowed = await removableOnParents(db, actor, items, (s) => s.teamId, teams, "EDITOR", "teamId");
  if (!allowed.length) return;
  await db
    .deleteFrom("match_game_scores")
    .where((eb) =>
      eb.or(
        allowed.map((s) =>
          eb.and([eb("match_team_id", "=", s.teamId), eb("match_game_id", "=", s.gameId)]),
        ),
      ),
    )
    .execute();
});
