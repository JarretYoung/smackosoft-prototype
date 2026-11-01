import { describe, expect, it } from "vitest";
import type { Match } from "../src/contract";
import { formatLength, playlistOf } from "../src/features/videos/videos";

const [team1, team2] = ["t1", "t2"];
const game = (id: string, gameNumber: number, start: string, scores: [number, number] | []) => ({
  id,
  gameNumber,
  startTime: start,
  endTime: start,
  videoCount: 0,
  scores: scores.length ? [{ matchTeamId: team1, score: scores[0] }, { matchTeamId: team2, score: scores[1] }] : [],
});
const match = (label: string, format: Match["format"], games: Match["games"]) =>
  ({ id: label, label, format, matchType: "MD", teams: [{ id: team1 }, { id: team2 }], games }) as unknown as Match;

describe("the length of a video", () => {
  it("is written the way YouTube writes it", () => {
    expect(formatLength(463)).toBe("7:43");
    expect(formatLength(59)).toBe("0:59");
    expect(formatLength(3725)).toBe("1:02:05");
    expect(formatLength(7200)).toBe("2:00:00");
  });
});

describe("the games the Videos page lists", () => {
  it("puts games from every match in the order they were played", () => {
    const list = playlistOf([
      match("Match 1", "BO3", [game("a", 1, "2026-11-01T10:00:00Z", [21, 17]), game("c", 2, "2026-11-01T11:00:00Z", [15, 21])]),
      match("Game 1", "BO1", [game("b", 1, "2026-11-01T10:30:00Z", [21, 14])]),
    ]);
    expect(list.map((g) => g.id)).toEqual(["a", "b", "c"]);
  });

  it("names a game in a match by its match, and a game on its own by itself", () => {
    const [inMatch, alone] = playlistOf([
      match("Match 1", "BO3", [game("a", 2, "2026-11-01T10:00:00Z", [21, 17])]),
      match("Game 4", "BO1", [game("b", 1, "2026-11-01T11:00:00Z", [21, 14])]),
    ]);
    expect(inMatch.name).toBe("Match 1 · Game 2");
    expect(alone.name).toBe("Game 4");
  });

  it("shows no result until both sides have a score", () => {
    const [full, none] = playlistOf([
      match("Game 1", "BO1", [game("a", 1, "2026-11-01T10:00:00Z", [21, 17])]),
      match("Game 2", "BO1", [game("b", 1, "2026-11-01T11:00:00Z", [])]),
    ]);
    expect(full.result).toBe("21 : 17");
    expect(none.result).toBeNull();
  });
});
