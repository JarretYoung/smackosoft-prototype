import { describe, expect } from "vitest";
import { endTime, newSession, scoredMatch, startTime } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

describe("matches, teams, games and scores", () => {
  test("an account plays for one team per match", async ({ world: w }) => {
    const { team2 } = await scoredMatch(w);
    // The owner already plays for team 1 of this match.
    const result = await w.b.matches.savePlayers([{ teamId: team2, accountId: w.owner.accountId }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "accountId"]] });
  });

  test("a score needs a team and a game from the same match", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const [otherMatch, otherTeam] = [id(), id()];
    ok(await w.b.matches.save([{ id: otherMatch, sessionId, label: "Match 2", matchType: "MS" }]));
    ok(await w.b.matches.saveTeams([{ id: otherTeam, matchId: otherMatch, label: "X" }]));

    const result = await w.b.matches.saveScores([{ teamId: otherTeam, gameId: game1, score: 5 }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "gameId"]] });
  });

  test("a match never moves to another session", async ({ world: w }) => {
    const { matchId } = await scoredMatch(w);
    const otherOwnSession = await newSession(w);
    const move = (sessionId: string) => w.b.matches.save([{ id: matchId, sessionId, label: "move", matchType: "MD" }]);

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
