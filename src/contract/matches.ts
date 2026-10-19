/** One aggregate: a match, its teams and players, its games and their scores. */
import { z } from "zod";
import type { Account } from "./accounts";
import { batch, MatchType, Timestamp, UUID } from "./common";
import type { Ack } from "./result";

const ids = batch(UUID, (id) => id);

// ------------------------------------------------------------------ inputs

export const MatchSave = z.object({
  id: UUID,
  sessionId: UUID,
  label: z.string().trim().min(1),
  matchType: MatchType,
});
export const SaveMatchesInput = batch(MatchSave, (m) => m.id);
export type SaveMatchesInput = z.input<typeof SaveMatchesInput>;

export const RemoveMatchesInput = ids;
export type RemoveMatchesInput = z.input<typeof RemoveMatchesInput>;

export const TeamSave = z.object({
  id: UUID,
  matchId: UUID,
  label: z.string().trim().min(1),
});
export const SaveTeamsInput = batch(TeamSave, (t) => t.id);
export type SaveTeamsInput = z.input<typeof SaveTeamsInput>;

export const RemoveTeamsInput = ids;
export type RemoveTeamsInput = z.input<typeof RemoveTeamsInput>;

export const MatchPlayerKey = z.object({ teamId: UUID, accountId: UUID });
export const SaveMatchPlayersInput = batch(MatchPlayerKey, (p) => `${p.teamId}:${p.accountId}`);
export type SaveMatchPlayersInput = z.input<typeof SaveMatchPlayersInput>;

export const RemoveMatchPlayersInput = SaveMatchPlayersInput;
export type RemoveMatchPlayersInput = SaveMatchPlayersInput;

export const GameSave = z
  .object({
    id: UUID,
    matchId: UUID,
    gameNumber: z.number().int().min(1),
    startTime: Timestamp,
    endTime: Timestamp,
  })
  .refine((g) => Date.parse(g.endTime) > Date.parse(g.startTime), {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export const SaveGamesInput = batch(GameSave, (g) => g.id);
export type SaveGamesInput = z.input<typeof SaveGamesInput>;

export const RemoveGamesInput = ids;
export type RemoveGamesInput = z.input<typeof RemoveGamesInput>;

export const GameScoreSave = z.object({
  teamId: UUID,
  gameId: UUID,
  score: z.number().int().min(0),
});
export const SaveGameScoresInput = batch(GameScoreSave, (s) => `${s.teamId}:${s.gameId}`);
export type SaveGameScoresInput = z.input<typeof SaveGameScoresInput>;

// ----------------------------------------------------------------- outputs

export type Game = {
  id: string;
  gameNumber: number;
  startTime: string;
  endTime: string;
  /** One entry per team that has a score. Missing means not scored yet. */
  scores: { teamId: string; score: number }[];
  videoCount: number;
};

export type Team = {
  id: string;
  label: string;
  players: Account[];
};

export type Match = {
  id: string;
  label: string;
  matchType: z.infer<typeof MatchType>;
  teams: Team[];
  games: Game[];
};

// --------------------------------------------------------------- interface

/** Matches are read through `sessions.get`. */
export interface MatchesApi {
  save(input: SaveMatchesInput): Promise<Ack>;
  remove(input: RemoveMatchesInput): Promise<Ack>;
  saveTeams(input: SaveTeamsInput): Promise<Ack>;
  removeTeams(input: RemoveTeamsInput): Promise<Ack>;
  /**
   * Also makes each account a VIEWER member of the session if it is not one yet.
   * That needs MANAGER. An EDITOR can only add accounts that are already members.
   * Fails with CONFLICT if an account would be on both teams of one match.
   */
  savePlayers(input: SaveMatchPlayersInput): Promise<Ack>;
  removePlayers(input: RemoveMatchPlayersInput): Promise<Ack>;
  saveGames(input: SaveGamesInput): Promise<Ack>;
  removeGames(input: RemoveGamesInput): Promise<Ack>;
  /** Fails with CONFLICT if a score's team and game belong to different matches. */
  saveScores(input: SaveGameScoresInput): Promise<Ack>;
}
