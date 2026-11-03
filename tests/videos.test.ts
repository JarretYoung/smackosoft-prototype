import { describe, expect, vi } from "vitest";
import { newSession, scoredMatch } from "./support/builders";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

/** Sets a key and answers the YouTube Data API from `durations` (ISO 8601 by id). Call `stop` to put things back. */
function youtubeSays(durations: Record<string, string>) {
  const real = globalThis.fetch;
  const asked: string[][] = [];
  process.env.YOUTUBE_API_KEY = "test-key";
  vi.stubGlobal("fetch", async (url: string | URL | Request, init?: RequestInit) => {
    if (!String(url).startsWith("https://www.googleapis.com/youtube/v3/videos")) return real(url, init);
    const ids = new URL(String(url)).searchParams.get("id")!.split(",");
    asked.push(ids);
    const items = ids.filter((i) => i in durations).map((i) => ({ id: i, contentDetails: { duration: durations[i] } }));
    return new Response(JSON.stringify({ items }));
  });
  return {
    asked,
    stop() {
      delete process.env.YOUTUBE_API_KEY;
      vi.unstubAllGlobals();
    },
  };
}

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

  test("reads a video's length from its source, keeps it through a rename, and lets a given length win", async ({ world: w }) => {
    const youtube = youtubeSays({ dQw4w9WgXcQ: "PT3M32S" });
    try {
      const [known, unknown, hosted, given] = [id(), id(), id(), id()];
      const lengthOf = async (video: string) =>
        (await w.admin.query("select duration_seconds from smackosoft.videos where id = $1", [video])).rows[0].duration_seconds;

      ok(await w.b.videos.save([
        { id: known, label: "Known", videoUrl: "https://youtu.be/dQw4w9WgXcQ" },
        { id: unknown, label: "Unknown", videoUrl: "https://youtu.be/aaaaaaaaaaa" },
        { id: hosted, label: "Hosted", videoUrl: "https://example.com/game.mp4" },
        { id: given, label: "Given", videoUrl: "https://youtu.be/dQw4w9WgXcQ", durationSeconds: 99 },
      ]));
      // One call for every YouTube video in the save, and none for a link no source claims.
      expect(youtube.asked).toEqual([["dQw4w9WgXcQ", "aaaaaaaaaaa"]]);
      expect([await lengthOf(known), await lengthOf(unknown), await lengthOf(hosted), await lengthOf(given)]).toEqual([212, null, null, 99]);

      // Saving again with a new name keeps the length and does not ask again. A new link is a new video, so it is asked.
      ok(await w.b.videos.save([{ id: known, label: "Renamed", videoUrl: "https://youtu.be/dQw4w9WgXcQ" }]));
      expect(youtube.asked).toHaveLength(1);
      expect(await lengthOf(known)).toBe(212);
      ok(await w.b.videos.save([{ id: known, label: "Renamed", videoUrl: "https://youtu.be/bbbbbbbbbbb" }]));
      expect(youtube.asked).toHaveLength(2);
      expect(await lengthOf(known)).toBeNull();
    } finally {
      youtube.stop();
    }
  });

  test("saves a video with no length when the source cannot be reached", async ({ world: w }) => {
    // No key is set, so there is no call at all. The video still saves.
    const video = id();
    ok(await w.b.videos.save([{ id: video, label: "Offline", videoUrl: "https://youtu.be/dQw4w9WgXcQ" }]));
    expect((await w.admin.query("select duration_seconds from smackosoft.videos where id = $1", [video])).rows[0].duration_seconds).toBeNull();
  });

  test("names the video a link points at, however the link is written", async ({ world: w }) => {
    const [a, b, c] = [id(), id(), id()];
    ok(await w.b.videos.save([
      { id: a, label: "Short link", videoUrl: "https://youtu.be/dQw4w9WgXcQ?si=x" },
      { id: b, label: "Playlist link", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1&t=30s" },
      { id: c, label: "Other host", videoUrl: "https://example.com/game.mp4" },
    ]));
    const keys = (await w.admin.query("select label, source_key from smackosoft.videos where id = any($1) order by label", [[a, b, c]])).rows;
    expect(keys).toEqual([
      { label: "Other host", source_key: null },
      { label: "Playlist link", source_key: "youtube:dQw4w9WgXcQ" },
      { label: "Short link", source_key: "youtube:dQw4w9WgXcQ" },
    ]);
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
