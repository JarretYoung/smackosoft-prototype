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

  test("keeps the length a video had when it was added, and refuses a length that is not positive", async ({ world: w }) => {
    const sessionId = await newSession(w);
    const [timed, untimed] = [id(), id()];
    ok(await w.b.videos.save([
      { id: timed, label: "Timed", videoUrl: "r2://t", durationSeconds: 463 },
      { id: untimed, label: "Untimed", videoUrl: "r2://u" },
    ]));
    ok(await w.b.videos.saveVideoSessions([{ videoId: timed, sessionId }, { videoId: untimed, sessionId }]));

    const lengths = ok(await w.b.videos.listBySession({ sessionId })).map((l) => [l.video.label, l.video.durationSeconds]);
    expect(lengths.sort()).toEqual([["Timed", 463], ["Untimed", null]]);

    expect(code(await w.b.videos.save([{ id: id(), label: "Zero", videoUrl: "r2://z", durationSeconds: 0 }]))).toBe("VALIDATION");
  });

  test("a sync point keeps its fraction of a second", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Frame accurate", videoUrl: "r2://f" }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 10.033 }]));

    const link = ok(await w.b.videos.listBySession({ sessionId })).find((l) => l.matchGameId === game1);
    expect(link?.canonicalOffset).toBe(10.033);
  });

  test("puts a video in a session, links it to a game, and replays with a new offset", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Court 1", videoUrl: "r2://a" }]));
    ok(await w.b.videos.saveVideoSessions([{ videoId: video, sessionId }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 12.5 }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 30 }]));

    const linked = ok(await w.b.videos.listBySession({ sessionId }));
    expect(linked.map((l) => [l.matchGameId === null, l.canonicalOffset]).sort()).toEqual([
      [false, 30],
      [true, null],
    ]);
    const own = ok(await w.b.videos.listOwn({ sessionId }));
    expect(own).toHaveLength(1);
    expect(own[0].links).toHaveLength(2);

    const details = ok(await w.b.sessions.get({ sessionId }));
    expect(details.matches[0].games.find((g) => g.id === game1)?.videoCount).toBe(1);
  });

  test("a game link puts the video in the session, can be unsynced, and can be negative", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Late start", videoUrl: "r2://d" }]));
    ok(await w.b.videos.saveVideoGames([
      { videoId: video, matchGameId: game1, canonicalOffset: -5 },
      { videoId: video, matchGameId: game2 },
    ]));

    const linked = ok(await w.b.videos.listBySession({ sessionId }));
    expect(linked).toHaveLength(3);
    expect(linked.filter((l) => l.matchGameId === null).map((l) => l.canonicalOffset)).toEqual([null]);
    expect(linked.find((l) => l.matchGameId === game1)?.canonicalOffset).toBe(-5);
    expect(linked.find((l) => l.matchGameId === game2)?.canonicalOffset).toBeNull();
  });

  test("shows who last changed a link", async ({ world: w }) => {
    const { sessionId, game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://g" }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1 }]));
    const gameLink = async () => ok(await w.b.videos.listBySession({ sessionId })).find((l) => l.matchGameId === game1)!;
    expect((await gameLink()).changedByName).toBe("owner");

    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));
    w.as(w.mate);
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 4 }]));
    expect(await gameLink()).toMatchObject({ changedByName: "mate", canonicalOffset: 4 });
  });

  test("removing a video from a session takes its game links, removing a game link keeps the session", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://f" }]));
    ok(await w.b.videos.saveVideoGames([
      { videoId: video, matchGameId: game1, canonicalOffset: 1 },
      { videoId: video, matchGameId: game2, canonicalOffset: 2 },
    ]));

    ok(await w.b.videos.removeVideoGames([{ videoId: video, matchGameId: game1 }]));
    expect(ok(await w.b.videos.listBySession({ sessionId })).map((l) => l.matchGameId === null).sort()).toEqual([false, true]);

    ok(await w.b.videos.removeVideoSessions([{ videoId: video, sessionId }]));
    expect(ok(await w.b.videos.listBySession({ sessionId }))).toEqual([]);
  });

  test("a game can only be linked by someone with access to its session", async ({ world: w }) => {
    const { game1 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://b" }]));
    w.as(await w.person("outsider"));
    const result = await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1 }]);
    expect(failure(result)).toEqual({ code: "NOT_FOUND", paths: [[0, "matchGameId"]] });
  });

  test("a video can only be put in another session by its owner", async ({ world: w }) => {
    const { sessionId } = await scoredMatch(w);
    const otherSession = await newSession(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://h" }]));
    ok(await w.b.videos.saveVideoSessions([{ videoId: video, sessionId }]));
    ok(await w.b.members.save([{ sessionId: otherSession, accountId: w.mate.accountId, role: "EDITOR" }]));

    w.as(w.mate);
    const result = await w.b.videos.saveVideoSessions([{ videoId: video, sessionId: otherSession }]);
    expect(failure(result)).toEqual({ code: "NOT_FOUND", paths: [[0, "videoId"]] });
  });

  test("an editor links a video already in the session, not an unrelated one", async ({ world: w }) => {
    const { sessionId, game1, game2 } = await scoredMatch(w);
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "V", videoUrl: "r2://c" }]));
    ok(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game1, canonicalOffset: 1 }]));
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));

    w.as(w.mate);
    expect(code(await w.b.videos.saveVideoGames([{ videoId: video, matchGameId: game2, canonicalOffset: 5 }]))).toBe("ok");
    const unrelated = await w.b.videos.saveVideoGames([{ videoId: id(), matchGameId: game2, canonicalOffset: 5 }]);
    expect(failure(unrelated)).toEqual({ code: "NOT_FOUND", paths: [[0, "videoId"]] });
  });
});
