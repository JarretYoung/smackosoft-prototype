import { describe, expect, it } from "vitest";
import type { Match } from "../src/contract";
import {
  advancesAfterScore,
  gamesReducer,
  isDirty,
  planMatchSave,
  toValues,
  winnerOf,
  type GameDraft,
  type TeamDraft,
} from "../src/features/matches/match-draft";

const id = () => crypto.randomUUID();
const sessionId = id();
const person = (name: string) => ({ id: id(), displayName: name, handle: name.toLowerCase(), avatarUrl: null, isGuest: false });

const ann = person("Ann");
const bo = person("Bo");
const team1 = id();
const team2 = id();
const game1 = id();

const match: Match = {
  id: id(),
  label: "Match 1",
  matchType: "MD",
  format: "BO3",
  teams: [
    { id: team1, label: "Team 1", players: [ann] },
    { id: team2, label: "Team 2", players: [bo] },
  ],
  games: [
    {
      id: game1,
      gameNumber: 3,
      startTime: "2026-11-06T11:00:00.000Z",
      endTime: "2026-11-06T11:20:00.000Z",
      scores: [
        { matchTeamId: team1, score: 21 },
        { matchTeamId: team2, score: 15 },
      ],
    },
  ],
} as Match;

describe("match editor scores", () => {
  it("ignores anything but up to three digits", () => {
    const list = toValues(match).games;
    expect(gamesReducer(list, { type: "score", gameId: game1, teamId: team1, value: "2a" })).toBe(list);
    expect(gamesReducer(list, { type: "score", gameId: game1, teamId: team1, value: "1000" })).toBe(list);
    expect(gamesReducer(list, { type: "score", gameId: game1, teamId: team1, value: "7" })[0].scores[team1]).toBe("7");
  });

  it("moves to the next box on the second digit only when typing forward", () => {
    expect(advancesAfterScore("2", "21")).toBe(true);
    expect(advancesAfterScore("", "21")).toBe(true);
    expect(advancesAfterScore("21", "2")).toBe(false);
    expect(advancesAfterScore("21", "211")).toBe(false);
    expect(advancesAfterScore("", "2")).toBe(false);
    expect(advancesAfterScore("2", "2a")).toBe(false);
  });

  it("picks the higher score as the winner, and nobody on a tie or a missing score", () => {
    const teams: TeamDraft[] = toValues(match).teams;
    const game = (a: string, b: string): GameDraft => ({ ...toValues(match).games[0], scores: { [team1]: a, [team2]: b } });
    expect(winnerOf(game("21", "15"), teams)).toBe(team1);
    expect(winnerOf(game("9", "15"), teams)).toBe(team2);
    expect(winnerOf(game("15", "15"), teams)).toBeNull();
    expect(winnerOf(game("15", ""), teams)).toBeNull();
  });
});

describe("match editor games", () => {
  it("never reuses a game number, even after the last game is removed", () => {
    let list = toValues(match).games;
    list = gamesReducer(list, { type: "remove", id: game1 });
    list = gamesReducer(list, { type: "add", id: id(), now: new Date("2026-11-06T12:00:00.000Z"), savedNumbers: [3] });
    expect(list.map((g) => g.gameNumber)).toEqual([4]);
  });

  it("starts a new game when the last one ended, and lasts 20 minutes", () => {
    const list = gamesReducer(toValues(match).games, { type: "add", id: id(), now: new Date(), savedNumbers: [3] });
    expect(list[1].startTime).toBe("2026-11-06T11:20:00.000Z");
    expect(list[1].endTime).toBe("2026-11-06T11:40:00.000Z");
  });

  it("puts a removed game back where it was, once", () => {
    const first = toValues(match).games[0];
    const two = gamesReducer([first], { type: "add", id: id(), now: new Date(), savedNumbers: [3] });
    const removed = gamesReducer(two, { type: "remove", id: first.id });
    const undone = gamesReducer(removed, { type: "restore", game: first, index: 0 });
    expect(undone.map((g) => g.id)).toEqual(two.map((g) => g.id));
    expect(gamesReducer(undone, { type: "restore", game: first, index: 0 })).toBe(undone);
  });
});

describe("match editor save plan", () => {
  it("clears a saved score when its box is blank, and saves the rest", () => {
    const values = toValues(match);
    values.games[0].scores[team2] = "";
    const plan = planMatchSave(match, sessionId, values);
    expect(plan.clearedScores).toEqual([{ matchTeamId: team2, matchGameId: game1 }]);
    expect(plan.scores).toEqual([{ matchTeamId: team1, matchGameId: game1, score: 21 }]);
  });

  it("moves a player between teams as a removal plus an addition", () => {
    const values = toValues(match);
    values.teams[0].playerIds = [];
    values.teams[1].playerIds = [bo.id, ann.id];
    const plan = planMatchSave(match, sessionId, values);
    expect(plan.removedPlayers).toEqual([{ matchTeamId: team1, accountId: ann.id }]);
    expect(plan.addedPlayers).toEqual([{ matchTeamId: team2, accountId: ann.id }]);
  });

  it("removes a deleted game without clearing its scores one by one", () => {
    const values = toValues(match);
    values.games = [];
    const plan = planMatchSave(match, sessionId, values);
    expect(plan.removedGameIds).toEqual([game1]);
    expect(plan.clearedScores).toEqual([]);
  });

  it("keeps the saved name when the field is blank", () => {
    expect(planMatchSave(match, sessionId, { ...toValues(match), label: "  " }).match.label).toBe("Match 1");
  });
});

describe("match editor unsaved changes", () => {
  it("ignores player order, and counts a changed score", () => {
    const saved = toValues(match);
    const reordered = { ...saved, teams: saved.teams.map((t) => ({ ...t, playerIds: [...t.playerIds].reverse() })) };
    expect(isDirty(reordered, saved)).toBe(false);
    const edited = toValues(match);
    edited.games[0].scores[team1] = "20";
    expect(isDirty(edited, saved)).toBe(true);
  });
});
