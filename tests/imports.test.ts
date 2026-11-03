import { describe, expect } from "vitest";
import type { Backend, ImportGamesInput, ImportRow } from "../src/contract";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

const KL = "Asia/Kuala_Lumpur";
let n = 0;
const video = () => `https://youtu.be/${String(++n).padStart(11, "v")}`;

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  date: "2026-10-24",
  label: "24 Oct SoongJit vs NadIan",
  videoUrl: video(),
  sides: [["Soong", "Jit"], ["Nad", "Ian"]],
  ...over,
});

/** A video with no game: no sides. */
const clip = (over: Partial<ImportRow> = {}): ImportRow => ({ date: "2026-10-24", label: "A point of view", videoUrl: video(), ...over });

/** Guests for every name, except those linked to the given accounts. */
const people = (names: string[], linked: Record<string, string> = {}): ImportGamesInput["people"] =>
  names.map((name) => (linked[name] ? { name, accountId: linked[name] } : { name, guest: { displayName: name, handle: `${name.toLowerCase()}_${id().replace(/-/g, "").slice(0, 8)}` } }));

const NAMES = ["Soong", "Jit", "Nad", "Ian"];
const run = (w: { b: Backend }, rows: ImportRow[], over: Partial<ImportGamesInput> = {}) =>
  w.b.imports.games({ timezone: KL, rows, people: people(NAMES), ...over });
const countOf = async (w: { admin: { query: (sql: string, params: unknown[]) => Promise<{ rows: { n: string }[] }> } }, table: string, owner: string) =>
  Number((await w.admin.query(`select count(*) as n from smackosoft.${table} where created_by = $1`, [owner])).rows[0].n);

describe("bulk import", () => {
  test("creates sessions, matches, games, players, scores and videos from rows", async ({ world: w }) => {
    const report = ok(
      await run(w, [
        row({ session: "Night", match: "1", game: 1, scores: [21, 17] }),
        row({ session: "Night", match: "1", game: 2, sides: [["Nad", "Ian"], ["Soong", "Jit"]], scores: [19, 21] }),
        row({ session: "Night", sides: [["Soong"], ["Ian"]] }),
        row({ date: "2026-10-25" }),
      ]),
    );
    expect(report.dryRun).toBe(false);
    expect(report.created).toEqual({ sessions: 2, matches: 3, games: 4, videos: 4, unlinked: 0, guests: 4 });
    expect(report.sessions.map((s) => [s.label, s.existing, s.matches, s.games])).toEqual([["Night", false, 2, 3], ["25 Oct 2026", false, 1, 1]]);

    const [night] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" })).filter((s) => s.label === "Night");
    const session = ok(await w.b.sessions.get({ sessionId: night.id }));
    expect(session.timezone).toBe(KL);
    expect(session.startTime).toBeNull();
    expect(session.matches.map((m) => [m.label, m.format, m.matchType, m.position, m.games.length])).toEqual([
      ["Match 1", "BO3", "MD", 1, 2],
      ["Game 1", "BO1", "MS", 2, 1],
    ]);
    // The second game was written with the sides the other way round, so its scores follow the players.
    const [team1] = session.matches[0].teams;
    expect(session.matches[0].games.map((g) => g.scores.find((s) => s.matchTeamId === team1.id)?.score)).toEqual([21, 21]);
    expect(session.matches[0].teams.map((t) => t.players.map((p) => p.displayName).sort())).toEqual([["Jit", "Soong"], ["Ian", "Nad"]]);
    expect(session.matches[0].teams[0].players.every((p) => p.isGuest)).toBe(true);
  });

  test("a dry run reports what would happen and keeps nothing", async ({ world: w }) => {
    const rows = [row({ match: "1", game: 1 }), row({ match: "1", game: 2 })];
    const dry = ok(await run(w, rows, { dryRun: true }));
    expect(dry.dryRun).toBe(true);
    expect(dry.created).toEqual({ sessions: 1, matches: 1, games: 2, videos: 2, unlinked: 0, guests: 4 });
    for (const table of ["sessions", "matches", "videos"]) expect(await countOf(w, table, w.owner.accountId)).toBe(0);
    expect((await w.admin.query("select 1 from smackosoft.accounts where created_by = $1 and id <> $1", [w.owner.accountId])).rowCount).toBe(0);

    const real = ok(await run(w, rows));
    expect(real.created).toEqual(dry.created);
  });

  test("a row with no players is a video in the session's pool, with no game, and it can make a session on its own", async ({ world: w }) => {
    const rows = [row(), clip({ label: "Top view" }), clip({ label: "Practice", date: "2026-10-26" })];
    const report = ok(await run(w, rows));
    expect(report.created).toEqual({ sessions: 2, matches: 1, games: 1, videos: 3, unlinked: 2, guests: 4 });
    expect(report.sessions.map((s) => [s.date, s.matches, s.games, s.videos])).toEqual([["2026-10-24", 1, 1, 1], ["2026-10-26", 0, 0, 1]]);

    const [match, practice] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-26" })).sort((a, b) => a.date.localeCompare(b.date));
    const inMatchDay = ok(await w.b.videos.listBySession({ sessionId: match.id }));
    // Every video is in the pool. Only the game's video is also linked to a game.
    const labelsWhere = (linked: boolean) => inMatchDay.filter((l) => (l.matchGameId !== null) === linked).map((l) => l.video.label).sort();
    expect(labelsWhere(true)).toEqual(["24 Oct SoongJit vs NadIan"]);
    expect(labelsWhere(false)).toEqual(["24 Oct SoongJit vs NadIan", "Top view"]);
    expect(ok(await w.b.sessions.get({ sessionId: practice.id })).matches).toEqual([]);
    expect(ok(await w.b.videos.listBySession({ sessionId: practice.id })).map((l) => l.video.label)).toEqual(["Practice"]);

    // Uploading the same file again adds nothing.
    const again = ok(await run(w, rows));
    expect(again.created).toMatchObject({ sessions: 0, games: 0, videos: 0, unlinked: 0 });
    expect(again.skipped).toHaveLength(3);
  });

  test("a video with no players cannot have a match or scores", async ({ world: w }) => {
    const result = await run(w, [clip({ match: "1" }), clip({ game: 2 }), clip({ scores: [21, 5] })]);
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["rows", 0, "sides"], ["rows", 1, "sides"], ["rows", 2, "sides"]] });
  });

  test("links names to accounts that exist and makes them members", async ({ world: w }) => {
    const report = ok(
      await run(w, [row({ sides: [["Soong"], ["Ian"]] })], {
        people: people(["Soong", "Ian"], { Soong: w.mate.accountId }),
      }),
    );
    expect(report.created.guests).toBe(1);
    // The report says which guest it made, so a later upload can link to it.
    expect(report.newGuests).toHaveLength(1);
    const made = (await w.admin.query("select handle from smackosoft.accounts where id = $1", [report.newGuests[0].accountId])).rows[0] as { handle: string };
    expect(made.handle).toBe(report.newGuests[0].handle);
    const [session] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" })).filter((s) => s.label === "24 Oct 2026");
    const handles = ok(await w.b.sessions.get({ sessionId: session.id })).members.map((m) => m.handle);
    expect(handles).toContain(w.mate.handle);
  });

  test("two names for one account are one player, so a match can use either", async ({ world: w }) => {
    const mate = w.mate.accountId;
    const report = ok(
      await run(
        w,
        [
          row({ match: "1", game: 1, sides: [["Wen"], ["Nad"]], scores: [21, 5] }),
          row({ match: "1", game: 2, sides: [["Nad"], ["Soong"]], scores: [8, 21] }),
        ],
        { people: [{ name: "Wen", accountId: mate }, { name: "Soong", accountId: mate }, ...people(["Nad"])] },
      ),
    );
    // One match with both games, one linked player, and one new guest for Nad.
    expect(report.created).toMatchObject({ matches: 1, games: 2, guests: 1 });
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));
    const [match] = ok(await w.b.sessions.get({ sessionId: saved.id })).matches;
    expect(match.teams.map((t) => t.players.map((p) => p.id))).toEqual([[mate], expect.any(Array)]);
    const [team1] = match.teams;
    // The second game was written with the sides turned, and its scores follow the person.
    expect(match.games.map((g) => g.scores.find((s) => s.matchTeamId === team1.id)?.score)).toEqual([21, 21]);
  });

  test("two names given the same new guest handle make one guest", async ({ world: w }) => {
    const handle = `wensoong_${id().replace(/-/g, "").slice(0, 8)}`;
    const guest = (name: string) => ({ name, guest: { displayName: "Wen Soong", handle } });
    const report = ok(
      await run(w, [row({ sides: [["Wen"], ["Nad"]] }), row({ sides: [["Soong"], ["Nad"]] })], { people: [guest("Wen"), guest("Soong"), ...people(["Nad"])] }),
    );
    expect(report.created.guests).toBe(2);
    expect((await w.admin.query("select count(*) as n from smackosoft.accounts where handle = $1", [handle])).rows[0].n).toBe("1");
  });

  test("the same person on both sides of a game is turned down, whichever name is used", async ({ world: w }) => {
    const mate = w.mate.accountId;
    const failed = failure(
      await run(w, [row({ sides: [["Wen"], ["Soong"]] })], { people: [{ name: "Wen", accountId: mate }, { name: "Soong", accountId: mate }] }),
    );
    expect(failed.paths).toContainEqual(["rows", 0, "sides"]);
    for (const table of ["sessions", "matches", "videos"]) expect(await countOf(w, table, w.owner.accountId)).toBe(0);
  });

  test("a second upload skips what is already there and adds the rest to the same session", async ({ world: w }) => {
    const first = [row(), row()];
    ok(await run(w, first));

    const again = ok(await run(w, [...first, row()], { people: people(NAMES) }));
    expect(again.skipped).toEqual([
      { row: 0, reason: "You already have this video" },
      { row: 1, reason: "You already have this video" },
    ]);
    expect(again.created).toMatchObject({ sessions: 0, matches: 1, games: 1, videos: 1 });
    expect(again.sessions[0].existing).toBe(true);

    const [session] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" })).filter((s) => s.label === "24 Oct 2026");
    // Numbered on from the games the session already had, and last in the order.
    expect(ok(await w.b.sessions.get({ sessionId: session.id })).matches.map((m) => [m.label, m.position])).toEqual([["Game 1", 1], ["Game 2", 2], ["Game 3", 3]]);
  });

  test("a row with a match number joins that match from an earlier upload, and uploading it again changes nothing", async ({ world: w }) => {
    const one = row({ match: "1", game: 1, scores: [21, 10] });
    ok(await run(w, [one]));

    // The sheet grew: the same first row, and a second game for match 1 written with the sides turned round.
    const second = row({ match: "1", game: 2, sides: [["Nad", "Ian"], ["Soong", "Jit"]], scores: [8, 21] });
    const grown = [one, second];
    // The second upload links each name to the guest the first one made.
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));
    const players = ok(await w.b.sessions.get({ sessionId: saved.id })).matches[0].teams.flatMap((t) => t.players);
    const named = NAMES.map((name) => ({ name, accountId: players.find((p) => p.displayName === name)!.id }));

    const joined = ok(await run(w, grown, { people: named }));
    expect(joined.skipped).toEqual([{ row: 0, reason: "You already have this video" }]);
    expect(joined.created).toMatchObject({ sessions: 0, matches: 0, games: 1, videos: 1, guests: 0 });

    const match = async () => ok(await w.b.sessions.get({ sessionId: saved.id })).matches;
    const [m] = await match();
    expect([m.label, m.format, m.games.map((g) => g.gameNumber), m.teams.length]).toEqual(["Match 1", "BO3", [1, 2], 2]);
    const [team1] = m.teams;
    expect(m.games.map((g) => g.scores.find((s) => s.matchTeamId === team1.id)?.score)).toEqual([21, 21]);

    const again = ok(await run(w, grown, { people: named }));
    expect(again.created).toMatchObject({ matches: 0, games: 0, videos: 0 });
    expect((await match()).map((x) => x.games.length)).toEqual([2]);
  });

  test("keeps the game numbers the sheet gives, so a game uploaded late lands in its place", async ({ world: w }) => {
    ok(await run(w, [row({ match: "1", game: 2 }), row({ match: "1", game: 3 })]));
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));
    const players = ok(await w.b.sessions.get({ sessionId: saved.id })).matches[0].teams.flatMap((t) => t.players);
    const named = NAMES.map((name) => ({ name, accountId: players.find((p) => p.displayName === name)!.id }));

    // Game 1 arrives last. The match already has games 2 and 3 and a Best of 3 format, and still fits.
    ok(await run(w, [row({ match: "1", game: 1 })], { people: named }));
    const [m] = ok(await w.b.sessions.get({ sessionId: saved.id })).matches;
    expect(m.games.map((g) => g.gameNumber).sort()).toEqual([1, 2, 3]);
    expect(m.format).toBe("BO3");

    // Another video for game 2 is turned down. It is not slipped in beside the first one.
    const clash = await run(w, [row({ match: "1", game: 2 })], { people: named });
    expect(failure(clash)).toEqual({ code: "VALIDATION", paths: [["rows", 0, "game"]] });
  });

  test("a row can finish an earlier import: an unlinked video becomes a game video, with no second copy", async ({ world: w }) => {
    const url = video();
    ok(await run(w, [clip({ videoUrl: url, label: "Top view" })]));
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));

    // The same link, now with players and a game. The saved video is linked to it.
    const done = ok(await run(w, [row({ videoUrl: url, label: "24 Oct SoongJit vs NadIan", match: "1", game: 1 })]));
    expect(done.created).toMatchObject({ sessions: 0, matches: 1, games: 1, videos: 0, unlinked: 0 });
    expect(done.skipped).toEqual([]);
    expect(await countOf(w, "videos", w.owner.accountId)).toBe(1);

    const links = ok(await w.b.videos.listBySession({ sessionId: saved.id }));
    expect(links.filter((l) => l.matchGameId !== null).map((l) => l.video.label)).toEqual(["Top view"]);

    // And once more is a no-op.
    expect(ok(await run(w, [row({ videoUrl: url, match: "1", game: 1 })])).created).toMatchObject({ matches: 0, games: 0, videos: 0 });
  });

  test("a video already in a different game is turned down, and the message says where", async ({ world: w }) => {
    const url = video();
    ok(await run(w, [row({ videoUrl: url, match: "1", game: 1 })]));
    const result = await run(w, [row({ videoUrl: url, match: "2", game: 1 })]);
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["rows", 0, "videoUrl"]] });
    const [issue] = (result as { ok: false; error: { issues?: { message: string }[] } }).error.issues!;
    expect(issue.message).toBe("This video is already in 24 Oct 2026, Match 1, game 1. Change it there, or delete that session and import again.");
    expect(await countOf(w, "matches", w.owner.accountId)).toBe(1);
  });

  test("a match deleted in the app comes back on the next import, with its videos linked again", async ({ world: w }) => {
    const rows = [row({ match: "1", game: 1 }), row({ match: "1", game: 2 })];
    ok(await run(w, rows));
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));
    const players = ok(await w.b.sessions.get({ sessionId: saved.id })).matches[0].teams.flatMap((t) => t.players);
    const named = NAMES.map((name) => ({ name, accountId: players.find((p) => p.displayName === name)!.id }));
    const [match] = ok(await w.b.sessions.get({ sessionId: saved.id })).matches;
    ok(await w.b.matches.remove([match.id]));
    expect(ok(await w.b.sessions.get({ sessionId: saved.id })).matches).toEqual([]);

    const again = ok(await run(w, rows, { people: named }));
    expect(again.created).toMatchObject({ sessions: 0, matches: 1, games: 2, videos: 0 });
    const [back] = ok(await w.b.sessions.get({ sessionId: saved.id })).matches;
    expect([back.label, back.games.map((g) => g.gameNumber).sort()]).toEqual(["Match 1", [1, 2]]);
    expect(await countOf(w, "videos", w.owner.accountId)).toBe(2);
  });

  test("two matches with one name in a session are an error, not a guess", async ({ world: w }) => {
    ok(await run(w, [row({ match: "1", game: 1 })]));
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" }));
    // A second match called "Match 1", made by hand.
    ok(await w.b.matches.save([{ id: id(), sessionId: saved.id, label: "Match 1", matchType: "MS", format: "BO1" }]));
    const result = await run(w, [row({ match: "1", game: 2 })]);
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["rows", 0, "match"]] });
  });

  test("the same rows give the same result in any order and any split", async ({ world: w }) => {
    const day = (date: string) => [
      row({ date, match: "1", game: 1, label: "m1g1" }),
      row({ date, match: "1", game: 2, label: "m1g2", sides: [["Nad", "Ian"], ["Soong", "Jit"]] }),
      row({ date, match: "1", game: 3, label: "m1g3" }),
      row({ date, label: "alone", sides: [["Soong"], ["Nad"]] }),
    ];
    // What a session holds, without ids: its matches, their games and the video in each. Only the position of
    // new matches follows the file, so the matches are compared by name and not by place.
    const shape = async (date: string) => {
      const [session] = ok(await w.b.sessions.list({ from: date, to: date }));
      const matches = ok(await w.b.sessions.get({ sessionId: session.id })).matches;
      const labelOfGame = new Map(ok(await w.b.videos.listBySession({ sessionId: session.id })).flatMap((l) => (l.matchGameId ? [[l.matchGameId, l.video.label] as const] : [])));
      return matches.map((m) => [m.label, m.format, m.games.map((g) => [g.gameNumber, labelOfGame.get(g.id)]).sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    };

    ok(await run(w, day("2026-10-24")));
    ok(await run(w, [...day("2026-10-25")].reverse()));

    // Split: the first upload makes the match from its last game. The second links every name to that upload's guests.
    const third = day("2026-10-26");
    ok(await run(w, [third[2]]));
    const [saved] = ok(await w.b.sessions.list({ from: "2026-10-26", to: "2026-10-26" }));
    const players = ok(await w.b.sessions.get({ sessionId: saved.id })).matches[0].teams.flatMap((t) => t.players);
    const named = NAMES.map((name) => ({ name, accountId: players.find((p) => p.displayName === name)!.id }));
    ok(await run(w, [third[0], third[1], third[3]], { people: named }));

    const [first, reversed, split] = [await shape("2026-10-24"), await shape("2026-10-25"), await shape("2026-10-26")];
    expect(first).toEqual([
      ["Game 1", "BO1", [[1, "alone"]]],
      ["Match 1", "BO3", [[1, "m1g1"], [2, "m1g2"], [3, "m1g3"]]],
    ]);
    expect(reversed).toEqual(first);
    expect(split).toEqual(first);
  });

  test("knows a video by what it is, not how its link is written", async ({ world: w }) => {
    ok(await run(w, [row({ videoUrl: "https://youtu.be/dQw4w9WgXcQ" })]));
    const again = ok(await run(w, [row({ videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1" })]));
    expect(again.skipped).toHaveLength(1);
    expect(again.created.videos).toBe(0);
  });

  test("reports every problem at once and imports nothing", async ({ world: w }) => {
    const result = await run(
      w,
      [row({ sides: [["Soong", "Nobody"], ["Nad"]] }), row({ match: "1", game: 1 }), row({ match: "1", game: 2, sides: [["Jit"], ["Ian"]] })],
      { people: people(["Soong", "Jit", "Nad", "Ian"]) },
    );
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["rows", 0, "sides"], ["rows", 2, "sides"]] });
    expect(await countOf(w, "sessions", w.owner.accountId)).toBe(0);
  });

  test("a handle that is taken points at the person, and nothing is kept", async ({ world: w }) => {
    const result = await run(w, [row()], {
      people: [
        ...people(["Soong", "Jit", "Nad"]),
        { name: "Ian", guest: { displayName: "Ian", handle: w.mate.handle } },
      ],
    });
    expect(failure(result).code).toBe("CONFLICT");
    expect(failure(result).paths[0].slice(0, 2)).toEqual(["people", 3]);
    expect(await countOf(w, "sessions", w.owner.accountId)).toBe(0);
    expect((await w.admin.query("select 1 from smackosoft.accounts where created_by = $1 and id <> $1", [w.owner.accountId])).rowCount).toBe(0);
  });

  test("a name linked to an account that does not exist points at the person", async ({ world: w }) => {
    const result = await run(w, [row()], { people: people(NAMES, { Soong: id() }) });
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["people", 0, "accountId"]] });
  });

  test("an editor cannot add people to a session they do not manage, and the whole import rolls back", async ({ world: w }) => {
    // The owner has a session on that day. The mate may edit it but not manage it.
    const sessionId = id();
    ok(await w.b.sessions.save([{ id: sessionId, label: "Shared", date: "2026-10-24", timezone: KL }]));
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));

    w.as(w.mate);
    const result = await run(w, [row({ session: "Shared" })]);
    expect(failure(result)).toEqual({ code: "FORBIDDEN", paths: [["rows", 0, "accountId"]] });
    expect(await countOf(w, "videos", w.mate.accountId)).toBe(0);
    expect(await countOf(w, "matches", w.mate.accountId)).toBe(0);
  });

  test("asks for rows, and not too many", async ({ world: w }) => {
    expect(code(await run(w, []))).toBe("VALIDATION");
    expect(code(await run(w, Array.from({ length: 301 }, () => row())))).toBe("VALIDATION");
  });

  test("rejects the same name listed twice", async ({ world: w }) => {
    const result = await run(w, [row()], { people: [...people(NAMES), ...people(["Soong"])] });
    expect(failure(result)).toEqual({ code: "VALIDATION", paths: [["people", 4, "name"]] });
  });
});
