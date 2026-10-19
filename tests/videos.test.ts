import { describe, expect } from "vitest";
import { newSession, scoredMatch } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

describe("videos", () => {
  test("rejects script and data URLs", async ({ world: w }) => {
    for (const videoUrl of ["javascript:alert(1)", "data:text/html,x", "not a url"]) {
      expect(code(await w.b.videos.save([{ id: id(), label: "Bad", videoUrl }]))).toBe("VALIDATION");
    }
  });

  test("links at session level and game level, and replays with a new offset", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Court 1", videoUrl: "r2://a" }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: null, offsetSeconds: 0 }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 12.5 }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 30 }]));

    const linked = ok(await w.b.videos.listBySession({ sessionId }));
    expect(linked.map((l) => [l.matchGameId === null, l.offsetSeconds]).sort()).toEqual([
      [false, 30],
      [true, 0],
    ]);
    const own = ok(await w.b.videos.listOwn({ sessionId }));
    expect(own).toHaveLength(1);
    expect(own[0].linkages).toHaveLength(2);

    const details = ok(await w.b.sessions.get({ sessionId }));
    expect(details.matches[0].games.find((g) => g.id === game1)?.videoCount).toBe(1);
  });

  test("a game must belong to the session it is linked in", async ({ world: w }) => {
    const { game1 } = await scoredMatch(w);
    const otherSession = await newSession(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://b" }]));
    const result = await w.b.videos.saveLinkages([{ videoId: video, sessionId: otherSession, matchGameId: game1, offsetSeconds: 1 }]);
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [[0, "matchGameId"]] });
  });

  test("an editor links a video already in the session, not an unrelated one", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://c" }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 1 }]));
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));

    w.as(w.mate);
    expect(code(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game2, offsetSeconds: 5 }]))).toBe("ok");
    const unrelated = await w.b.videos.saveLinkages([{ videoId: id(), sessionId, matchGameId: game2, offsetSeconds: 5 }]);
    expect(failure(unrelated)).toEqual({ code: "NOT_FOUND", paths: [[0, "videoId"]] });
  });
});
