import { ok, type MatchFormat, type MatchType, type Result } from "@/src/contract";
import { saveGames, saveMatches, saveTeams } from "@/src/features/matches/actions";

/** A game on its own (best of 1) is called a game. Anything longer is a match. */
export const nounOf = (format: MatchFormat) => (format === "BO1" ? "game" : "match");

/**
 * Adds a game or a match with its two teams. A game on its own (best of 1) also gets its one game,
 * so it can be scored at once. A match starts with no games. Returns the new id.
 * Each kind is numbered on its own: Game 1, Match 1, Game 2. The match goes last in the session.
 * The type repeats the last one in the session, since a session is usually all singles or all doubles.
 */
export async function addMatch(
  sessionId: string,
  format: MatchFormat,
  existing: { format: MatchFormat; matchType: MatchType }[],
): Promise<Result<string>> {
  const id = crypto.randomUUID();
  const sameKind = existing.filter((m) => nounOf(m.format) === nounOf(format)).length;
  const label = `${format === "BO1" ? "Game" : "Match"} ${sameKind + 1}`;

  const matchType = existing.at(-1)?.matchType ?? "MD";
  const created = await saveMatches([{ id, sessionId, label, matchType, format }]);
  if (!created.ok) return created;
  const teams = await saveTeams([
    { id: crypto.randomUUID(), matchId: id, label: "Team 1" },
    { id: crypto.randomUUID(), matchId: id, label: "Team 2" },
  ]);
  if (!teams.ok) return teams;
  if (format === "BO1") {
    const game = await saveGames([{ id: crypto.randomUUID(), matchId: id, gameNumber: 1 }]);
    if (!game.ok) return game;
  }
  return ok(id);
}
