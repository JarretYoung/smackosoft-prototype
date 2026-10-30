import type { Backend } from "../../src/contract";
import { id, type Person } from "./fixtures";
import { ok } from "./helpers";

type Who = { b: Backend; owner: Person; mate: Person; stranger: Person };

const today = () => new Date().toISOString().slice(0, 10);
export const startTime = "2026-10-18T10:00:00Z";
export const endTime = "2026-10-18T10:20:00Z";

/** A session owned by the signed-in actor. */
export async function newSession(w: Pick<Who, "b">, overrides: { label?: string } = {}) {
  const sessionId = id();
  ok(await w.b.sessions.save([{ id: sessionId, label: overrides.label ?? "Smash", date: today(), courtFee: 20, currency: "MYR" }]));
  return sessionId;
}

/**
 * Owner and mate play team 1. Stranger plays team 2. Two games, team 1 wins both.
 * Acts as the owner. Everyone who plays becomes a member.
 */
export async function scoredMatch(w: Who) {
  const sessionId = await newSession(w);
  const [matchId, team1, team2, game1, game2] = [id(), id(), id(), id(), id()];
  ok(await w.b.matches.save([{ id: matchId, sessionId, label: "Match 1", matchType: "MD" }]));
  ok(await w.b.matches.saveTeams([
    { id: team1, matchId, label: "Team 1" },
    { id: team2, matchId, label: "Team 2" },
  ]));
  ok(await w.b.matches.saveGames([
    { id: game1, matchId, gameNumber: 1, startTime, endTime },
    { id: game2, matchId, gameNumber: 2, startTime, endTime },
  ]));
  ok(await w.b.matches.saveMatchPlayers([
    { matchTeamId: team1, accountId: w.owner.accountId },
    { matchTeamId: team1, accountId: w.mate.accountId },
    { matchTeamId: team2, accountId: w.stranger.accountId },
  ]));
  ok(await w.b.matches.saveGameScores([
    { matchTeamId: team1, matchGameId: game1, score: 21 },
    { matchTeamId: team2, matchGameId: game1, score: 17 },
    { matchTeamId: team1, matchGameId: game2, score: 21 },
    { matchTeamId: team2, matchGameId: game2, score: 19 },
  ]));
  return { sessionId, matchId, team1, team2, game1, game2 };
}
