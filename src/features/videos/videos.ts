import type { SessionVideo } from "@/src/contract";

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
