import { describe, expect } from "vitest";
import { scoredMatch, newSession } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

describe("sessions", () => {
  test("a repeated key in one call is rejected and points at the repeat", async ({ world: w }) => {
    const session = { id: id(), label: "A", date: "2026-10-18" };
    expect(code(await w.b.sessions.save([]))).toBe("ok");
    expect(failure(await w.b.sessions.save([session, session]))).toEqual({ code: "VALIDATION", paths: [[1]] });
  });

  test("an id owned by someone else is a conflict", async ({ world: w }) => {
    const sessionId = await newSession(w);
    w.as(w.stranger);
    const result = await w.b.sessions.save([{ id: sessionId, label: "mine now", date: "2026-10-18" }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "id"]] });
  });

  test("a failing item rolls back the whole call", async ({ world: w }) => {
    const taken = await newSession(w);
    w.as(w.stranger);
    const fresh = id();
    const result = await w.b.sessions.save([
      { id: fresh, label: "valid", date: "2026-10-18" },
      { id: taken, label: "clash", date: "2026-10-18" },
    ]);
    expect(failure(result).code).toBe("CONFLICT");
    const written = await w.admin.query("select 1 from smackosoft.sessions where id = $1", [fresh]);
    expect(written.rowCount).toBe(0);
  });

  test("details return the whole session in one read", async ({ world: w }) => {
    const { sessionId, team1 } = await scoredMatch(w);
    const details = ok(await w.b.sessions.get({ sessionId }));
    expect(details).toMatchObject({ myRole: "OWNER", courtFee: 20, currency: "MYR" });
    expect(details.members).toHaveLength(3);
    const [match] = details.matches;
    expect(match.teams.map((t) => t.players.length)).toEqual([2, 1]);
    expect(match.games.map((g) => g.scores.length)).toEqual([2, 2]);
    expect(match.teams[0].id).toBe(team1);

    const listed = ok(await w.b.sessions.list()).find((s) => s.id === sessionId);
    expect(listed).toMatchObject({ matchCount: 1, myRole: "OWNER" });
  });

  test("replaying a full build changes nothing", async ({ world: w }) => {
    const first = await scoredMatch(w);
    const before = ok(await w.b.sessions.get({ sessionId: first.sessionId }));
    // Same ids, same values.
    ok(await w.b.sessions.save([{ id: first.sessionId, label: "Smash", date: before.date, courtFee: 20, currency: "MYR" }]));
    ok(await w.b.matches.save([{ id: first.matchId, sessionId: first.sessionId, label: "Match 1", matchType: "MD" }]));
    ok(await w.b.matches.saveTeams([
      { id: first.team1, matchId: first.matchId, label: "Team 1" },
      { id: first.team2, matchId: first.matchId, label: "Team 2" },
    ]));
    ok(await w.b.matches.savePlayers([
      { teamId: first.team1, accountId: w.owner.accountId },
      { teamId: first.team2, accountId: w.stranger.accountId },
    ]));
    ok(await w.b.matches.saveScores([{ teamId: first.team1, gameId: first.game1, score: 21 }]));
    expect(ok(await w.b.sessions.get({ sessionId: first.sessionId }))).toEqual(before);
  });

  test("removing a session removes its dependents, keeps videos and replays", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Court", videoUrl: "r2://x" }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 3 }]));

    expect(code(await w.b.sessions.remove([sessionId]))).toBe("ok");
    expect(code(await w.b.sessions.remove([sessionId]))).toBe("ok");

    const left = await w.admin.query(
      `select (select count(*) from smackosoft.sessions where id = $1) as sessions,
              (select count(*) from smackosoft.matches where session_id = $1) as matches,
              (select count(*) from smackosoft.video_linkages where session_id = $1) as linkages,
              (select count(*) from smackosoft.videos where id = $2) as videos`,
      [sessionId, video],
    );
    expect(Object.values(left.rows[0]).map(Number)).toEqual([0, 0, 0, 1]);
  });
});
