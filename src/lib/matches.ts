import type { Match, Team } from "@/src/contract";

/**
 * Who is ahead in a match. The backend stores scores as entered, so the winner is worked out here.
 * Each game is won by the higher score. Ties and unscored games count for nobody.
 */
export function summarize(match: Match) {
  const wins = new Map<string, number>(match.teams.map((t) => [t.id, 0]));
  for (const game of match.games) {
    const scored = game.scores.filter((s) => wins.has(s.matchTeamId));
    if (scored.length < 2) continue;
    const top = Math.max(...scored.map((s) => s.score));
    const leaders = scored.filter((s) => s.score === top);
    if (leaders.length === 1) wins.set(leaders[0].matchTeamId, (wins.get(leaders[0].matchTeamId) ?? 0) + 1);
  }
  const rows = match.teams.map((team) => ({ team, wins: wins.get(team.id) ?? 0 }));
  const best = Math.max(0, ...rows.map((r) => r.wins));
  const leaders = rows.filter((r) => r.wins === best && best > 0);
  return { rows, winnerId: leaders.length === 1 ? leaders[0].team.id : null };
}

export function gameWinnerId(match: Match, gameId: string): string | null {
  const game = match.games.find((g) => g.id === gameId);
  if (!game || game.scores.length < 2) return null;
  const top = Math.max(...game.scores.map((s) => s.score));
  const leaders = game.scores.filter((s) => s.score === top);
  return leaders.length === 1 ? leaders[0].matchTeamId : null;
}

export const scoreOf = (match: Match, gameId: string, team: Team) =>
  match.games.find((g) => g.id === gameId)?.scores.find((s) => s.matchTeamId === team.id)?.score ?? null;
