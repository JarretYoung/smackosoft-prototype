import { describe, expect } from "vitest";
import type { Backend } from "../src/contract";
import { endTime, newSession, scoredMatch, startTime } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok, whileLocked } from "./support/helpers";

describe("matches, teams, games and scores", () => {
  test("an account plays for one team per match", async ({ world: w }) => {
    const { team2 } = await scoredMatch(w);
    // The owner already plays for team 1 of this match.
    const result = await w.b.matches.saveMatchPlayers([{ matchTeamId: team2, accountId: w.owner.accountId }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "accountId"]] });
  });

  test("a match has one or two teams", async ({ world: w }) => {
    const { matchId, team1, team2 } = await scoredMatch(w);
    const third = await w.b.matches.saveTeams([{ id: id(), matchId, label: "Team 3" }]);
    expect(failure(third)).toEqual({ code: "CONFLICT", paths: [[0, "matchId"]] });

    expect(code(await w.b.matches.removeTeams([team2]))).toBe("ok");
    const last = await w.b.matches.removeTeams([team1]);
    expect(failure(last)).toEqual({ code: "CONFLICT", paths: [[0]] });

    // The freed slot can be used again.
    expect(code(await w.b.matches.saveTeams([{ id: id(), matchId, label: "Team 2 again" }]))).toBe("ok");
  });

  describe("parallel calls cannot break the limits", () => {
    const emptyMatch = async (w: { b: Backend }) => {
      const sessionId = await newSession(w);
      const matchId = id();
      ok(await w.b.matches.save([{ id: matchId, sessionId, label: "Race", matchType: "MD", format: "BO3" }]));
      return matchId;
    };
    const lockTeams = (teamIds: string[]): [string, unknown[]] => [
      "select 1 from smackosoft.match_teams where id = any($1) for update",
      [teamIds],
    ];

    test("two teams added at once leave at most two", async ({ world: w }) => {
      const matchId = await emptyMatch(w);
      ok(await w.b.matches.saveTeams([{ id: id(), matchId, label: "Team 1" }]));

      const results = await whileLocked(
        w.admin,
        "select 1 from smackosoft.matches where id = $1 for update",
        [matchId],
        () =>
          Promise.all([
            w.b.matches.saveTeams([{ id: id(), matchId, label: "A" }]),
            w.b.matches.saveTeams([{ id: id(), matchId, label: "B" }]),
          ]),
      );
      expect(results.map(code).sort()).toEqual(["CONFLICT", "ok"]);
    });

    test("two teams removed at once leave one", async ({ world: w }) => {
      const matchId = await emptyMatch(w);
      const [team1, team2] = [id(), id()];
      ok(await w.b.matches.saveTeams([
        { id: team1, matchId, label: "Team 1" },
        { id: team2, matchId, label: "Team 2" },
      ]));

      const results = await whileLocked(w.admin, ...lockTeams([team1, team2]), () =>
        Promise.all([w.b.matches.removeTeams([team1]), w.b.matches.removeTeams([team2])]),
      );
      expect(results.map(code).sort()).toEqual(["CONFLICT", "ok"]);
    });

    test("an account added to both teams at once ends up on one", async ({ world: w }) => {
      const matchId = await emptyMatch(w);
      const [team1, team2] = [id(), id()];
      ok(await w.b.matches.saveTeams([
        { id: team1, matchId, label: "Team 1" },
        { id: team2, matchId, label: "Team 2" },
      ]));

      const results = await whileLocked(w.admin, ...lockTeams([team1, team2]), () =>
        Promise.all([
          w.b.matches.saveMatchPlayers([{ matchTeamId: team1, accountId: w.mate.accountId }]),
          w.b.matches.saveMatchPlayers([{ matchTeamId: team2, accountId: w.mate.accountId }]),
        ]),
      );
      expect(results.map(code).sort()).toEqual(["CONFLICT", "ok"]);
    });
  });

  test("a score needs a team and a game from the same match", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const [otherMatch, otherTeam] = [id(), id()];
    ok(await w.b.matches.save([{ id: otherMatch, sessionId, label: "Match 2", matchType: "MS", format: "BO1" }]));
    ok(await w.b.matches.saveTeams([{ id: otherTeam, matchId: otherMatch, label: "X" }]));

    const result = await w.b.matches.saveGameScores([{ matchTeamId: otherTeam, matchGameId: game1, score: 5 }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "matchGameId"]] });
  });

  test("a cleared score leaves the game and the other team's score", async ({ world: w }) => {
    const { sessionId, matchId, team2, game1 } = await scoredMatch(w);
    ok(await w.b.matches.removeGameScores([{ matchTeamId: team2, matchGameId: game1 }]));
    // Clearing a score that is already gone is not an error.
    ok(await w.b.matches.removeGameScores([{ matchTeamId: team2, matchGameId: game1 }]));

    const session = ok(await w.b.sessions.get({ sessionId }));
    const game = session.matches.find((m) => m.id === matchId)!.games.find((g) => g.id === game1)!;
    expect(game.scores.map((s) => s.score)).toEqual([21]);
  });

  describe("a match holds the games its format allows", () => {
    const game = (matchId: string, gameNumber: number) => ({ id: id(), matchId, gameNumber, startTime, endTime });

    test("a single game match refuses a second game", async ({ world: w }) => {
      const sessionId = await newSession(w);
      const matchId = id();
      ok(await w.b.matches.save([{ id: matchId, sessionId, label: "One-off", matchType: "MS", format: "BO1" }]));
      ok(await w.b.matches.saveGames([game(matchId, 1)]));

      expect(failure(await w.b.matches.saveGames([game(matchId, 2)]))).toEqual({ code: "CONFLICT", paths: [[0, "matchId"]] });
    });

    test("saving a game again does not count as a new game", async ({ world: w }) => {
      const sessionId = await newSession(w);
      const matchId = id();
      ok(await w.b.matches.save([{ id: matchId, sessionId, label: "One-off", matchType: "MS", format: "BO1" }]));
      const first = game(matchId, 1);
      ok(await w.b.matches.saveGames([first]));
      ok(await w.b.matches.saveGames([{ ...first, endTime: "2026-10-18T10:30:00Z" }]));
    });

    test("a format cannot shrink below the games already played", async ({ world: w }) => {
      const { sessionId, matchId } = await scoredMatch(w); // two games
      const to = (format: "BO1" | "BO5") =>
        w.b.matches.save([{ id: matchId, sessionId, label: "Match 1", matchType: "MD", format }]);

      expect(failure(await to("BO1"))).toEqual({ code: "CONFLICT", paths: [[0, "format"]] });
      ok(await to("BO5"));
    });
  });

  test("a match never moves to another session", async ({ world: w }) => {
    const { matchId } = await scoredMatch(w);
    const otherOwnSession = await newSession(w);
    const move = (sessionId: string) => w.b.matches.save([{ id: matchId, sessionId, label: "move", matchType: "MD", format: "BO3" }]);

    expect(failure(await move(otherOwnSession))).toEqual({ code: "CONFLICT", paths: [[0]] });
    expect(failure(await move(id()))).toEqual({ code: "NOT_FOUND", paths: [[0, "sessionId"]] });
  });

  test("a failing item rolls back the whole call", async ({ world: w }) => {
    const { matchId } = await scoredMatch(w);
    const fresh = id();
    const result = await w.b.matches.saveGames([
      { id: fresh, matchId, gameNumber: 3, startTime, endTime },
      { id: id(), matchId: id(), gameNumber: 1, startTime, endTime }, // match does not exist
    ]);
    expect(failure(result)).toEqual({ code: "NOT_FOUND", paths: [[1, "matchId"]] });
    expect((await w.admin.query("select 1 from smackosoft.match_games where id = $1", [fresh])).rowCount).toBe(0);
  });

  test("removal hides what you cannot see and blocks what you cannot edit", async ({ world: w }) => {
    const { matchId, sessionId } = await scoredMatch(w);

    w.as(w.stranger); // plays, so is a viewer member
    expect(failure(await w.b.matches.remove([matchId]))).toEqual({ code: "FORBIDDEN", paths: [[0, "id"]] });

    const outsider = await w.person("outsider");
    w.as(outsider);
    expect(code(await w.b.matches.remove([matchId]))).toBe("ok");
    w.as(w.owner);
    expect(ok(await w.b.sessions.get({ sessionId })).matches).toHaveLength(1);
  });
});
