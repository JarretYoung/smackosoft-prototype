/**
 * PROVISIONAL analytics. The only place that defines "win".
 *
 * - A game is won by the team with the highest score. Equal scores, or a missing
 *   score, count as neither a win nor a loss.
 * - A match is won by the team that wins more games than it loses.
 *
 * Computed at query time in memory. Move it into SQL when it gets slow.
 */
import type { Stats, TeammateStat } from "../contract";
import { accountColumns, toAccount } from "./queries/accounts";
import { NoInput, read } from "./core";
import type { Db } from "./db/client";

type Outcome = "win" | "loss" | "tie";

async function loadActorHistory(db: Db, accountId: string) {
  const mine = await db
    .selectFrom("match_players")
    .innerJoin("match_teams", "match_teams.id", "match_players.match_team_id")
    .innerJoin("matches", "matches.id", "match_teams.match_id")
    .innerJoin("sessions", "sessions.id", "matches.session_id")
    .select([
      "match_teams.id as team_id",
      "matches.id as match_id",
      "matches.created_at as match_created_at",
      "sessions.date as session_date",
    ])
    .where("match_players.account_id", "=", accountId)
    .execute();
  if (!mine.length) return { mine, games: [], teammates: [] };

  const scores = await db
    .selectFrom("match_game_scores")
    .innerJoin("match_games", "match_games.id", "match_game_scores.match_game_id")
    .select(["match_games.id as game_id", "match_games.match_id", "match_game_scores.match_team_id as team_id", "match_game_scores.score"])
    .where("match_games.match_id", "in", mine.map((m) => m.match_id))
    .execute();
  const byGame = new Map<string, { matchId: string; scores: Map<string, number> }>();
  for (const row of scores) {
    const game = byGame.get(row.game_id) ?? { matchId: row.match_id, scores: new Map() };
    game.scores.set(row.team_id, row.score);
    byGame.set(row.game_id, game);
  }

  const teammates = await db
    .selectFrom("match_players")
    .innerJoin("accounts", "accounts.id", "match_players.account_id")
    .select([...accountColumns, "match_players.match_team_id as team_id"])
    .where("match_players.match_team_id", "in", mine.map((m) => m.team_id))
    .where("match_players.account_id", "<>", accountId)
    .execute();

  return { mine, games: [...byGame.values()], teammates };
}

function gameOutcome(scores: Map<string, number>, teamId: string): Outcome {
  const own = scores.get(teamId);
  const others = [...scores.entries()].filter(([id]) => id !== teamId).map(([, score]) => score);
  if (own === undefined || !others.length) return "tie";
  const best = Math.max(...others);
  return own > best ? "win" : own < best ? "loss" : "tie";
}

export const getStats = read(NoInput, async ({ db, actor }): Promise<Stats> => {
  const { mine, games } = await loadActorHistory(db, actor.accountId);

  const decided = mine
    .map((m) => {
      const outcomes = games
        .filter((g) => g.matchId === m.match_id)
        .map((g) => gameOutcome(g.scores, m.team_id));
      const wins = outcomes.filter((o) => o === "win").length;
      const losses = outcomes.filter((o) => o === "loss").length;
      return { m, result: wins > losses ? "win" : losses > wins ? "loss" : "tie" } as const;
    })
    .filter((d) => d.result !== "tie")
    .sort(
      (a, b) =>
        b.m.session_date.localeCompare(a.m.session_date) ||
        b.m.match_created_at.getTime() - a.m.match_created_at.getTime(),
    );

  const wins = decided.filter((d) => d.result === "win").length;
  const losses = decided.length - wins;
  let streak = 0;
  for (const d of decided) {
    if (d.result !== "win") break;
    streak += 1;
  }
  return {
    matches: mine.length,
    wins,
    losses,
    winRate: decided.length ? wins / decided.length : null,
    streak,
  };
});

export const getTeammateStats = read(NoInput, async ({ db, actor }): Promise<TeammateStat[]> => {
  const { mine, games, teammates } = await loadActorHistory(db, actor.accountId);
  const teamOfMatch = new Map(mine.map((m) => [m.match_id, m.team_id]));

  const byAccount = new Map<string, TeammateStat>();
  for (const mate of teammates) {
    const entry = byAccount.get(mate.id) ?? { account: toAccount(mate), games: 0, wins: 0, losses: 0, winRate: null };
    const teamId = mate.team_id;
    for (const game of games) {
      if (teamOfMatch.get(game.matchId) !== teamId) continue;
      const outcome = gameOutcome(game.scores, teamId);
      if (outcome === "tie") continue;
      entry.games += 1;
      if (outcome === "win") entry.wins += 1;
      else entry.losses += 1;
    }
    entry.winRate = entry.games ? entry.wins / entry.games : null;
    byAccount.set(mate.id, entry);
  }
  return [...byAccount.values()].sort((a, b) => b.games - a.games);
});
