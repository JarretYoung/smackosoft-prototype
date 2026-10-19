/** Provisional. The definition of "win" lives in the stats module only. May change freely. */
import type { Account } from "./accounts";
import type { Result } from "./result";

export type Stats = {
  matches: number;
  wins: number;
  losses: number;
  /** wins / (wins + losses). Null when there are no decided matches. */
  winRate: number | null;
  /** Consecutive wins up to the latest decided match. */
  streak: number;
};

export type TeammateStat = {
  account: Account;
  games: number;
  wins: number;
  losses: number;
  winRate: number | null;
};

export interface StatsApi {
  get(): Promise<Result<Stats>>;
  getTeammates(): Promise<Result<TeammateStat[]>>;
}
