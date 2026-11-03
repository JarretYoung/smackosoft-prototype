import type { Match, SessionVideo } from "@/src/contract";

/** 463 as "7:43", 3725 as "1:02:05". The length of a video, as YouTube writes it. */
export function formatLength(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** One game of the session as the Videos page lists it. */
export type PlaylistGame = {
  id: string;
  /** "Game 3" for a game played on its own, "Match 1 · Game 2" for a game in a match. */
  name: string;
  /** "21 : 17" in team order, or null until both sides have a score. */
  result: string | null;
};

/** Every game of the session in the order played: matches by position, games by number. */
export function playlistOf(matches: Match[]): PlaylistGame[] {
  return [...matches]
    .sort((a, b) => a.position - b.position)
    .flatMap((match) =>
      [...match.games]
        .sort((a, b) => a.gameNumber - b.gameNumber)
        .map((game): PlaylistGame => {
          const points = match.teams.map((team) => game.scores.find((s) => s.matchTeamId === team.id)?.score);
          return {
            id: game.id,
            name: match.format === "BO1" ? match.label : `${match.label} · Game ${game.gameNumber}`,
            result: points.length === 2 && points.every((p) => p !== undefined) ? `${points[0]} : ${points[1]}` : null,
          };
        }),
    );
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
