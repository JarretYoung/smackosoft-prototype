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

  test("pools a video, links it to a game, and replays with a new offset", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Court 1", videoUrl: "r2://a" }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: null }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 12.5 }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 30 }]));

    const linked = ok(await w.b.videos.listBySession({ sessionId }));
    expect(linked.map((l) => [l.matchGameId === null, l.offsetSeconds]).sort()).toEqual([
      [false, 30],
      [true, null],
    ]);
    const own = ok(await w.b.videos.listOwn({ sessionId }));
    expect(own).toHaveLength(1);
    expect(own[0].linkages).toHaveLength(2);

    const details = ok(await w.b.sessions.get({ sessionId }));
    expect(details.matches[0].games.find((g) => g.id === game1)?.videoCount).toBe(1);
  });

  test("a game link joins the pool, can be unsynced, and can be negative", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Late start", videoUrl: "r2://d" }]));
    ok(await w.b.videos.saveLinkages([
      { videoId: video, sessionId, matchGameId: game1, offsetSeconds: -5 },
      { videoId: video, sessionId, matchGameId: game2 },
    ]));

    const linked = ok(await w.b.videos.listBySession({ sessionId }));
    expect(linked).toHaveLength(3);
    expect(linked.filter((l) => l.matchGameId === null).map((l) => l.offsetSeconds)).toEqual([null]);
    expect(linked.find((l) => l.matchGameId === game1)?.offsetSeconds).toBe(-5);
    expect(linked.find((l) => l.matchGameId === game2)?.offsetSeconds).toBeNull();
  });

  test("shows who last changed a link", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://g" }]));
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1 }]));
    const gameLink = async () => ok(await w.b.videos.listBySession({ sessionId })).find((l) => l.matchGameId === game1)!;
    expect((await gameLink()).changedBy).toBe("owner");

    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));
    w.as(w.mate);
    ok(await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: game1, offsetSeconds: 4 }]));
    expect(await gameLink()).toMatchObject({ changedBy: "mate", offsetSeconds: 4 });
  });

  test("a pool link cannot carry an offset", async ({ world: w }) => {
    const { sessionId } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://e" }]));
    const result = await w.b.videos.saveLinkages([{ videoId: video, sessionId, matchGameId: null, offsetSeconds: 3 }]);
    expect(code(result)).toBe("VALIDATION");
  });

  test("removing a pool link takes the game links, removing a game link keeps the pool link", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://f" }]));
    ok(await w.b.videos.saveLinkages([
      { videoId: video, sessionId, matchGameId: game1, offsetSeconds: 1 },
      { videoId: video, sessionId, matchGameId: game2, offsetSeconds: 2 },
    ]));

    ok(await w.b.videos.removeLinkages([{ videoId: video, sessionId, matchGameId: game1 }]));
    expect(ok(await w.b.videos.listBySession({ sessionId })).map((l) => l.matchGameId === null).sort()).toEqual([false, true]);

    ok(await w.b.videos.removeLinkages([{ videoId: video, sessionId, matchGameId: null }]));
    expect(ok(await w.b.videos.listBySession({ sessionId }))).toEqual([]);
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
