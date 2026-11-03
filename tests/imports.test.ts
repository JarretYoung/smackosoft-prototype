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
        row({ session: "Night", match: "1", scores: [21, 17] }),
        row({ session: "Night", match: "1", sides: [["Nad", "Ian"], ["Soong", "Jit"]], scores: [19, 21] }),
        row({ session: "Night", sides: [["Soong"], ["Ian"]] }),
        row({ date: "2026-10-25" }),
      ]),
    );
    expect(report.dryRun).toBe(false);
    expect(report.created).toEqual({ sessions: 2, matches: 3, games: 4, videos: 4, guests: 4 });
    expect(report.sessions.map((s) => [s.label, s.existing, s.matches, s.games])).toEqual([["Night", false, 2, 3], ["25 Oct 2026", false, 1, 1]]);
    expect(report.videos).toHaveLength(4);

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
    const rows = [row({ match: "1" }), row({ match: "1" })];
    const dry = ok(await run(w, rows, { dryRun: true }));
    expect(dry.dryRun).toBe(true);
    expect(dry.created).toEqual({ sessions: 1, matches: 1, games: 2, videos: 2, guests: 4 });
    for (const table of ["sessions", "matches", "videos"]) expect(await countOf(w, table, w.owner.accountId)).toBe(0);
    expect((await w.admin.query("select 1 from smackosoft.accounts where created_by = $1 and id <> $1", [w.owner.accountId])).rowCount).toBe(0);

    const real = ok(await run(w, rows));
    expect(real.created).toEqual(dry.created);
  });

  test("links names to accounts that exist and makes them members", async ({ world: w }) => {
    const report = ok(
      await run(w, [row({ sides: [["Soong"], ["Ian"]] })], {
        people: people(["Soong", "Ian"], { Soong: w.mate.accountId }),
      }),
    );
    expect(report.created.guests).toBe(1);
    const [session] = ok(await w.b.sessions.list({ from: "2026-10-24", to: "2026-10-24" })).filter((s) => s.label === "24 Oct 2026");
    const handles = ok(await w.b.sessions.get({ sessionId: session.id })).members.map((m) => m.handle);
    expect(handles).toContain(w.mate.handle);
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
    const one = row({ match: "1", scores: [21, 10] });
    ok(await run(w, [one]));

    // The sheet grew: the same first row, and a second game for match 1 written with the sides turned round.
    const second = row({ match: "1", sides: [["Nad", "Ian"], ["Soong", "Jit"]], scores: [8, 21] });
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

  test("knows a video by what it is, not how its link is written", async ({ world: w }) => {
    ok(await run(w, [row({ videoUrl: "https://youtu.be/dQw4w9WgXcQ" })]));
    const again = ok(await run(w, [row({ videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1" })]));
    expect(again.skipped).toHaveLength(1);
    expect(again.created.videos).toBe(0);
  });

  test("reports every problem at once and imports nothing", async ({ world: w }) => {
    const result = await run(
      w,
      [row({ sides: [["Soong", "Nobody"], ["Nad"]] }), row({ match: "1" }), row({ match: "1", sides: [["Jit"], ["Ian"]] })],
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
