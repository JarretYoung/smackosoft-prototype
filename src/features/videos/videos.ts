import type { Match, SessionVideo } from "@/src/contract";

/** One game of the session as the Videos page lists it. */
export type PlaylistGame = {
  id: string;
  /** "Game 3" for a game played on its own, "Match 1 · Game 2" for a game in a match. */
  name: string;
  /** "21 : 17" in team order, or null until both sides have a score. */
  result: string | null;
  startTime: string;
};

/** Every game of the session in the order it was played, whichever match it belongs to. */
export function playlistOf(matches: Match[]): PlaylistGame[] {
  return matches
    .flatMap((match) =>
      match.games.map((game): PlaylistGame => {
        const points = match.teams.map((team) => game.scores.find((s) => s.matchTeamId === team.id)?.score);
        return {
          id: game.id,
          name: match.format === "BO1" ? match.label : `${match.label} · Game ${game.gameNumber}`,
          result: points.length === 2 && points.every((p) => p !== undefined) ? `${points[0]} : ${points[1]}` : null,
          startTime: game.startTime,
        };
      }),
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Footage that needs someone to act on it:
 * - `unsynced`: a game link with no sync point, in the order the games appear
 * - `unassigned`: pool footage that no game uses yet (never counted when the page is focused on one game)
 */
export function attentionOf(linked: SessionVideo[], gameOrder: string[], focus: string | null) {
  const inGame = new Set(linked.filter((l) => l.matchGameId !== null).map((l) => l.videoId));
  const rank = (l: SessionVideo) => gameOrder.indexOf(l.matchGameId ?? "");
  const unsynced = linked
    .filter((l) => l.matchGameId !== null && l.canonicalOffset === null && (!focus || l.matchGameId === focus))
    .sort((a, b) => rank(a) - rank(b));
  const unassigned = focus ? [] : linked.filter((l) => l.matchGameId === null && !inGame.has(l.videoId));
  return { unsynced, unassigned };
}
