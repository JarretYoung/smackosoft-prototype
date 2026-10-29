/**
 * The integration surface between frontend and backend.
 *
 * The frontend codes against `Backend`. The real implementation is in src/server.
 * Rules and guidelines: docs/use-cases.md.
 *
 * One file per feature, each with its inputs, outputs and interface:
 * accounts, sessions, members, matches, videos, stats.
 * Call sites read `backend.videos.save(...)`.
 */
import type { AccountsApi } from "./accounts";
import type { MatchesApi } from "./matches";
import type { MembersApi } from "./members";
import type { SessionsApi } from "./sessions";
import type { StatsApi } from "./stats";
import type { VideosApi } from "./videos";

export * from "./result";
export * from "./common";
export * from "./accounts";
export * from "./sessions";
export * from "./members";
export * from "./matches";
export * from "./videos";
export * from "./stats";

export interface Backend {
  accounts: AccountsApi;
  sessions: SessionsApi;
  members: MembersApi;
  matches: MatchesApi;
  videos: VideosApi;
  stats: StatsApi;
}
