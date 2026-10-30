import { z } from "zod";
import type { Match } from "../../contract";
import { timeInputToIso } from "../../lib/format";

export type TeamDraft = { id: string; label: string; playerIds: string[] };

export type GameDraft = {
  id: string;
  gameNumber: number;
  startTime: string;
  endTime: string;
  /** Score text per team id. Blank means not entered. */
  scores: Record<string, string>;
};

/** What the match editor stages. Nothing is written until the person saves. */
export type MatchValues = {
  label: string;
  matchType: Match["matchType"];
  teams: TeamDraft[];
  games: GameDraft[];
};

/** A new game is assumed to last this long. The times are editable on each game. */
export const DEFAULT_GAME_MINUTES = 20;

/** Up to three digits. A blank box is allowed. */
const SCORE_TEXT = /^\d{0,3}$/;

export const matchSchema = z.object({
  label: z.string(),
  matchType: z.custom<MatchValues["matchType"]>(),
  teams: z.custom<TeamDraft[]>(),
  games: z.custom<GameDraft[]>(),
});

export function toValues(match: Match): MatchValues {
  return {
    label: match.label,
    matchType: match.matchType,
    teams: match.teams.map((t) => ({ id: t.id, label: t.label, playerIds: t.players.map((p) => p.id) })),
    games: match.games.map((game) => ({
      id: game.id,
      gameNumber: game.gameNumber,
      startTime: game.startTime,
      endTime: game.endTime,
      scores: Object.fromEntries(game.scores.map((s) => [s.matchTeamId, String(s.score)])),
    })),
  };
}

export type GamesAction =
  | { type: "score"; gameId: string; teamId: string; value: string }
  | { type: "time"; gameId: string; field: "startTime" | "endTime"; time: string }
  /** `savedNumbers` are the saved games' numbers, so a number is never reused. */
  | { type: "add"; id: string; now: Date; savedNumbers: number[] }
  | { type: "remove"; id: string }
  /** Undo a removal. Does nothing when the game is back already. */
  | { type: "restore"; game: GameDraft; index: number };

export function gamesReducer(list: GameDraft[], action: GamesAction): GameDraft[] {
  switch (action.type) {
    case "score":
      if (!SCORE_TEXT.test(action.value)) return list;
      return list.map((g) =>
        g.id === action.gameId ? { ...g, scores: { ...g.scores, [action.teamId]: action.value } } : g,
      );
    case "time":
      if (!action.time) return list;
      return list.map((g) =>
        g.id === action.gameId ? { ...g, [action.field]: timeInputToIso(g[action.field], action.time) } : g,
      );
    case "add": {
      // The next game starts when the last one ended, or now for the first.
      const start = list.length ? new Date(list[list.length - 1].endTime) : action.now;
      return [
        ...list,
        {
          id: action.id,
          // Numbers are never reused, so a removed game leaves a gap nobody sees.
          gameNumber: Math.max(0, ...list.map((g) => g.gameNumber), ...action.savedNumbers) + 1,
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + DEFAULT_GAME_MINUTES * 60_000).toISOString(),
          scores: {},
        },
      ];
    }
    case "remove":
      return list.filter((g) => g.id !== action.id);
    case "restore":
      if (list.some((g) => g.id === action.game.id)) return list;
      return [...list.slice(0, action.index), action.game, ...list.slice(action.index)];
  }
}

/** Two digits is a full badminton score, so typing the second digit moves on to the next score box. */
export function advancesAfterScore(before: string, value: string): boolean {
  return SCORE_TEXT.test(value) && value.length === 2 && before.length < 2;
}

/** The team with the higher score, or null for a tie or when a side has no score yet. */
export function winnerOf(game: GameDraft, teams: TeamDraft[]): string | null {
  const entered = teams
    .filter((t) => (game.scores[t.id] ?? "") !== "")
    .map((t) => ({ id: t.id, score: Number(game.scores[t.id]) }));
  if (entered.length < 2) return null;
  const top = Math.max(...entered.map((s) => s.score));
  const leaders = entered.filter((s) => s.score === top);
  return leaders.length === 1 ? leaders[0].id : null;
}

/** Plain text of everything the person can edit, for comparing against the saved values. */
function snapshot(values: MatchValues): string {
  return JSON.stringify([
    values.label,
    values.matchType,
    values.teams.map((t) => [t.id, [...t.playerIds].sort()]),
    values.games.map((g) => [g.id, g.startTime, g.endTime, values.teams.map((t) => g.scores[t.id] ?? "")]),
  ]);
}

/** True when the values differ from the saved ones. Compared as text so any edit counts. */
export function isDirty(values: MatchValues, saved: MatchValues): boolean {
  return snapshot(values) !== snapshot(saved);
}

/**
 * The writes that turn the saved match into the staged one, in dependency order.
 * Removals come before additions, so someone can move between teams in one save.
 * A blank box over a saved score clears it.
 */
export function planMatchSave(match: Match, sessionId: string, values: MatchValues) {
  const savedPlayers = match.teams.flatMap((t) => t.players.map((p) => ({ matchTeamId: t.id, accountId: p.id })));
  const stagedPlayers = values.teams.flatMap((t) => t.playerIds.map((accountId) => ({ matchTeamId: t.id, accountId })));
  const key = (p: { matchTeamId: string; accountId: string }) => `${p.matchTeamId}:${p.accountId}`;
  const savedKeys = new Set(savedPlayers.map(key));
  const stagedKeys = new Set(stagedPlayers.map(key));

  const keptGameIds = new Set(values.games.map((g) => g.id));

  return {
    match: { id: match.id, sessionId, label: values.label.trim() || match.label, matchType: values.matchType },
    teams: values.teams.map((t) => ({ id: t.id, matchId: match.id, label: t.label })),
    removedPlayers: savedPlayers.filter((p) => !stagedKeys.has(key(p))),
    addedPlayers: stagedPlayers.filter((p) => !savedKeys.has(key(p))),
    removedGameIds: match.games.filter((g) => !keptGameIds.has(g.id)).map((g) => g.id),
    games: values.games.map((g) => ({
      id: g.id,
      matchId: match.id,
      gameNumber: g.gameNumber,
      startTime: g.startTime,
      endTime: g.endTime,
    })),
    clearedScores: match.games.flatMap((saved) => {
      const game = values.games.find((g) => g.id === saved.id);
      if (!game) return []; // The game was removed, and its scores went with it.
      return saved.scores
        .filter((s) => (game.scores[s.matchTeamId] ?? "") === "")
        .map((s) => ({ matchTeamId: s.matchTeamId, matchGameId: saved.id }));
    }),
    scores: values.games.flatMap((g) =>
      values.teams.flatMap((t) => {
        const text = g.scores[t.id] ?? "";
        return text === "" ? [] : [{ matchTeamId: t.id, matchGameId: g.id, score: Number(text) }];
      }),
    ),
  };
}
