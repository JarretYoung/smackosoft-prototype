import { describe, expect, it } from "vitest";
import type { Match } from "../src/contract";
import { tally } from "../src/features/matches/scores";

const id = () => crypto.randomUUID();
const [team1, team2] = [id(), id()];
const person = (name: string) => ({ id: id(), displayName: name, handle: name.toLowerCase(), avatarUrl: null, isGuest: false });

const game = (scores: [number, number]) => ({
  id: id(),
  gameNumber: 1,
  startTime: "2026-11-06T11:00:00.000Z",
  endTime: "2026-11-06T11:20:00.000Z",
  scores: [
    { matchTeamId: team1, score: scores[0] },
    { matchTeamId: team2, score: scores[1] },
  ],
  videoCount: 0,
});

const match = (format: Match["format"], games: Match["games"]): Match => ({
  id: id(),
  label: "Match",
  matchType: "MS",
  format,
  teams: [
    { id: team1, label: "Team 1", players: [person("Ann")] },
    { id: team2, label: "Team 2", players: [person("Bo")] },
  ],
  games,
});

describe("what a match shows big", () => {
  it("a free format match shows the games each side has won", () => {
    const { rows } = tally(match("FREE", [game([21, 17]), game([21, 10])]));
    expect(rows.map((r) => r.value)).toEqual([2, 0]);
  });

  it("a best of 1 match shows the points of its game", () => {
    const { rows, winnerId } = tally(match("BO1", [game([21, 17])]));
    expect(rows.map((r) => r.value)).toEqual([21, 17]);
    expect(winnerId).toBe(team1);
  });

  it("a best of match shows the games each side has won", () => {
    const { rows, winnerId } = tally(match("BO3", [game([21, 17]), game([15, 21]), game([21, 19])]));
    expect(rows.map((r) => r.value)).toEqual([2, 1]);
    expect(winnerId).toBe(team1);
  });

  it("a best of 1 match with no score yet shows 0 to 0 and no winner", () => {
    const { rows, winnerId } = tally(match("BO1", [{ ...game([0, 0]), scores: [] }]));
    expect(rows.map((r) => r.value)).toEqual([0, 0]);
    expect(winnerId).toBeNull();
  });
});
