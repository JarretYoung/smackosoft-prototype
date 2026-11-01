import { describe, expect } from "vitest";
import { scoredMatch, newSession } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

const KL = "Asia/Kuala_Lumpur";

describe("sessions", () => {
  test("a day lists the session that starts first first, and one without a start last", async ({ world: w }) => {
    const [late, early, undated] = [id(), id(), id()];
    const day = { date: "2026-10-18", timezone: KL };
    // Saved in the order that would put them wrong if creation time decided.
    ok(await w.b.sessions.save([{ id: undated, label: "Undated", ...day }]));
    ok(await w.b.sessions.save([{ id: late, label: "Late", ...day, startTime: "2026-10-18T12:00:00Z", endTime: "2026-10-18T14:00:00Z" }]));
    ok(await w.b.sessions.save([{ id: early, label: "Early", ...day, startTime: "2026-10-18T01:00:00Z", endTime: "2026-10-18T03:00:00Z" }]));
    const listed = ok(await w.b.sessions.list({ from: "2026-10-18", to: "2026-10-18" }));
    const mine = new Set<string>([late, early, undated]);
    expect(listed.map((s) => s.id).filter((sessionId) => mine.has(sessionId))).toEqual([early, late, undated]);
  });

  test("a session keeps its own timezone, and an unknown zone is rejected", async ({ world: w }) => {
    const sessionId = id();
    expect(failure(await w.b.sessions.save([{ id: sessionId, label: "A", date: "2026-10-18", timezone: "Mars/Olympus" }]))).toEqual({
      code: "VALIDATION",
      paths: [[0, "timezone"]],
    });
    ok(await w.b.sessions.save([{ id: sessionId, label: "A", date: "2026-10-18", timezone: "Europe/London" }]));
    expect(ok(await w.b.sessions.get({ sessionId })).timezone).toBe("Europe/London");
    expect(ok(await w.b.sessions.list({ from: "2026-10-01", to: "2026-10-31" })).find((s) => s.id === sessionId)?.timezone).toBe("Europe/London");
  });

  test("a repeated key in one call is rejected and points at the repeat", async ({ world: w }) => {
    const session = { id: id(), label: "A", date: "2026-10-18", timezone: KL };
    expect(code(await w.b.sessions.save([]))).toBe("ok");
    expect(failure(await w.b.sessions.save([session, session]))).toEqual({ code: "VALIDATION", paths: [[1]] });
  });

  test("an id owned by someone else is a conflict", async ({ world: w }) => {
    const sessionId = await newSession(w);
    w.as(w.stranger);
    const result = await w.b.sessions.save([{ id: sessionId, label: "mine now", date: "2026-10-18", timezone: KL }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "id"]] });
  });

  test("a failing item rolls back the whole call", async ({ world: w }) => {
    const taken = await newSession(w);
    w.as(w.stranger);
    const fresh = id();
    const result = await w.b.sessions.save([
      { id: fresh, label: "valid", date: "2026-10-18", timezone: KL },
      { id: taken, label: "clash", date: "2026-10-18", timezone: KL },
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
    ok(await w.b.sessions.save([{ id: first.sessionId, label: "Smash", date: before.date, timezone: before.timezone, courtFee: 20, currency: "MYR" }]));
    ok(await w.b.matches.save([{ id: first.matchId, sessionId: first.sessionId, label: "Match 1", matchType: "MD", format: "BO3" }]));
    ok(await w.b.matches.saveTeams([
      { id: first.team1, matchId: first.matchId, label: "Team 1" },
      { id: first.team2, matchId: first.matchId, label: "Team 2" },
    ]));
    ok(await w.b.matches.saveMatchPlayers([
      { matchTeamId: first.team1, accountId: w.owner.accountId },
      { matchTeamId: first.team2, accountId: w.stranger.accountId },
    ]));
    ok(await w.b.matches.saveGameScores([{ matchTeamId: first.team1, matchGameId: first.game1, score: 21 }]));
    expect(ok(await w.b.sessions.get({ sessionId: first.sessionId }))).toEqual(before);
  });

  test("removing a session removes its dependents, keeps videos and replays", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Court", videoUrl: "r2://x" }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 3 }]));

    expect(code(await w.b.sessions.remove([sessionId]))).toBe("ok");
    expect(code(await w.b.sessions.remove([sessionId]))).toBe("ok");

    const left = await w.admin.query(
      `select (select count(*) from smackosoft.sessions where id = $1) as sessions,
              (select count(*) from smackosoft.matches where session_id = $1) as matches,
              (select count(*) from smackosoft.video_sessions where session_id = $1)
                + (select count(*) from smackosoft.video_games where match_game_id = $3) as linkages,
              (select count(*) from smackosoft.videos where id = $2) as videos`,
      [sessionId, video, game1],
    );
    expect(Object.values(left.rows[0]).map(Number)).toEqual([0, 0, 0, 1]);
  });
});

describe("session details", () => {
  test("keeps the planned times, the maps link and the cover image", async ({ world: w }) => {
    const base = { id: id(), label: "Evening", date: "2026-10-30", timezone: KL };
    const full = {
      ...base,
      startTime: "2026-10-30T20:00:00.000Z",
      endTime: "2026-10-30T22:30:00.000Z",
      location: "Bukit Jalil",
      locationUrl: "https://maps.example.com/bukit-jalil",
      coverUrl: "https://img.example.com/court.jpg",
    };
    ok(await w.b.sessions.save([full]));
    expect(ok(await w.b.sessions.get({ sessionId: base.id }))).toMatchObject({
      startTime: full.startTime,
      endTime: full.endTime,
      locationUrl: full.locationUrl,
      coverUrl: full.coverUrl,
    });

    const backwards = await w.b.sessions.save([{ ...full, endTime: "2026-10-30T19:00:00.000Z" }]);
    expect(failure(backwards)).toEqual({ code: "VALIDATION", paths: [[0, "endTime"]] });
  });

  test("keeps the coordinates, and refuses half a pair or a place off the map", async ({ world: w }) => {
    const base = { id: id(), label: "Evening", date: "2026-10-30", timezone: KL };
    ok(await w.b.sessions.save([{ ...base, latitude: 3.0906026, longitude: 101.6063411 }]));
    expect(ok(await w.b.sessions.get({ sessionId: base.id }))).toMatchObject({ latitude: 3.0906026, longitude: 101.6063411 });

    // Saving again without them clears them, like every other field.
    ok(await w.b.sessions.save([base]));
    expect(ok(await w.b.sessions.get({ sessionId: base.id }))).toMatchObject({ latitude: null, longitude: null });

    expect(failure(await w.b.sessions.save([{ ...base, latitude: 3.09 }]))).toEqual({
      code: "VALIDATION",
      paths: [[0, "longitude"]],
    });
    expect(failure(await w.b.sessions.save([{ ...base, latitude: 91, longitude: 101.6 }]))).toEqual({
      code: "VALIDATION",
      paths: [[0, "latitude"]],
    });
  });
});
