import { describe, expect, it } from "vitest";
import type { ImportRow } from "../src/contract";
import { dateLabel } from "../src/lib/import-rules";
import { classifyKnownVideos, formatFor, heldKey, matchTypeFor, mergeAliases, planImport, type KnownVideo } from "../src/server/import-plan";

const known = new Set(["Soong", "Jit", "Nad", "Ian", "Far", "Jus"]);
let n = 0;
const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  date: "2026-10-24",
  label: "A game",
  videoUrl: `https://youtu.be/${String(++n).padStart(11, "x")}`,
  sides: [["Soong", "Jit"], ["Nad", "Ian"]],
  ...over,
});
const plan = (rows: ImportRow[], skip: number[] = []) => planImport(rows, new Set(skip), known);

describe("which format a number of games makes", () => {
  it("is Best of 1, 3, 5, then free", () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(formatFor)).toEqual(["BO1", "BO3", "BO3", "BO5", "BO5", "FREE", "FREE"]);
  });

  it("calls two a side doubles, one a side singles, and anything else other", () => {
    expect(matchTypeFor([["a"], ["b"]])).toBe("MS");
    expect(matchTypeFor([["a", "b"], ["c", "d"]])).toBe("MD");
    expect(matchTypeFor([["a"], ["b", "c"]])).toBe("OTHER");
  });
});

describe("two names for one person", () => {
  const rows = [{ sides: [["Wen"], ["Nad"]] as [string[], string[]] }, { sides: [["Nad"], ["Soong"]] as [string[], string[]] }];

  it("keeps the first name and rewrites the others to it, for the same account", () => {
    const merged = mergeAliases(rows, [{ name: "Wen", accountId: "a" }, { name: "Soong", accountId: "a" }, { name: "Nad", accountId: "b" }]);
    expect(merged.rows.map((r) => r.sides)).toEqual([[["Wen"], ["Nad"]], [["Nad"], ["Wen"]]]);
    expect(merged.people.map((p) => [p.person.name, p.index])).toEqual([["Wen", 0], ["Nad", 2]]);
  });

  it("treats new guests with the same handle as one guest, whatever the case", () => {
    const guest = (name: string, handle: string) => ({ name, guest: { displayName: name, handle } });
    const merged = mergeAliases(rows, [guest("Wen", "wensoong"), guest("Soong", "WenSoong"), guest("Nad", "nad")]);
    expect(merged.people.map((p) => p.person.name)).toEqual(["Wen", "Nad"]);
  });

  it("leaves different people alone", () => {
    const merged = mergeAliases(rows, [{ name: "Wen", accountId: "a" }, { name: "Soong", accountId: "b" }, { name: "Nad", accountId: "c" }]);
    expect(merged.rows).toEqual(rows);
    expect(merged.people).toHaveLength(3);
  });
});

describe("planning an import", () => {
  it("makes each row with no match number a game on its own, in file order", () => {
    const { sessions, issues } = plan([row(), row({ sides: [["Jus"], ["Far"]] })]);
    expect(issues).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].matches.map((m) => [m.format, m.matchType, m.games.length])).toEqual([["BO1", "MD", 1], ["BO1", "MS", 1]]);
  });

  it("groups rows with the same match name and picks the format from their count", () => {
    const { sessions, issues } = plan([row({ match: "1", game: 1 }), row(), row({ match: "1", game: 2 })]);
    expect(issues).toEqual([]);
    // The match is placed where its first row is. The game on its own comes after it, and is game 1.
    expect(sessions[0].matches.map((m) => [m.format, m.games.map((g) => [g.row, g.number])])).toEqual([["BO3", [[0, 1], [2, 2]]], ["BO1", [[1, 1]]]]);
  });

  it("takes game numbers as given, in any order and with gaps", () => {
    const { sessions, issues } = plan([row({ match: "1", game: 3 }), row({ match: "1", game: 1 })]);
    expect(issues).toEqual([]);
    expect(sessions[0].matches[0].games.map((g) => g.number)).toEqual([3, 1]);
  });

  it("counts the same match name in another session as another match", () => {
    const { sessions } = plan([row({ match: "1", game: 1 }), row({ match: "1", game: 1, date: "2026-10-25" })]);
    expect(sessions.map((s) => s.matches.map((m) => m.games.length))).toEqual([[1], [1]]);
  });

  it("splits one day into two sessions by the session column", () => {
    const { sessions } = plan([row({ session: "Morning" }), row({ session: "Evening" }), row({ session: "Morning" })]);
    expect(sessions.map((s) => [s.label, s.matches.length])).toEqual([["Morning", 2], ["Evening", 1]]);
  });

  it("titles a session by its day when it has no name", () => {
    expect(plan([row()]).sessions[0].label).toBe("24 Oct 2026");
    expect(dateLabel("2027-03-05")).toBe("5 Mar 2027");
  });

  it("adds a row to the saved match with its name, as the game number it gives", () => {
    const held = new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: [["Soong", "Jit"], ["Nad", "Ian"]] as [string[], string[]], gameNumbers: [1], format: "BO1" as const }]]);
    const { sessions, issues } = planImport([row({ match: "1", game: 2, sides: [["Ian", "Nad"], ["Jit", "Soong"]], scores: [21, 9] })], new Set(), known, held);
    expect(issues).toEqual([]);
    const [match] = sessions[0].matches;
    // One game was there, so the match grows to Best of 3. The scores follow the saved sides.
    expect([match.key, match.format, match.games.map((g) => [g.number, g.scores])]).toEqual(["1", "BO3", [[2, [9, 21]]]]);
  });

  it("turns down a game number the saved match already has", () => {
    const held = new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: [["Soong", "Jit"], ["Nad", "Ian"]] as [string[], string[]], gameNumbers: [1, 2], format: "BO3" as const }]]);
    const { issues } = planImport([row({ match: "1", game: 2 })], new Set(), known, held);
    expect(issues).toEqual([{ path: ["rows", 0, "game"], message: "Game 2 of match 1 is already saved in this session" }]);
  });

  it("turns down other players than the saved match has", () => {
    const held = new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: [["Soong"], ["Nad"]] as [string[], string[]], gameNumbers: [1], format: "BO1" as const }]]);
    const { issues } = planImport([row({ match: "1", game: 2 })], new Set(), known, held);
    expect(issues.map((i) => i.path)).toEqual([["rows", 0, "sides"]]);
  });

  it("keeps the saved format while the games fit, and grows it when they do not", () => {
    const side: [string[], string[]] = [["Soong"], ["Nad"]];
    const held = (games: number) =>
      new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: side, gameNumbers: Array.from({ length: games }, (_, i) => i + 1), format: "BO3" as const }]]);
    const one = (games: number) => planImport([row({ match: "1", game: games + 1, sides: side })], new Set(), known, held(games));
    expect(one(1).sessions[0].matches[0].format).toBe("BO3");
    expect(one(3).sessions[0].matches[0].format).toBe("BO5");
  });

  it("lets the sides swap between games and swaps the scores with them", () => {
    const swapped = row({ match: "1", game: 2, sides: [["Nad", "Ian"], ["Jit", "Soong"]], scores: [21, 15] });
    const { sessions, issues } = plan([row({ match: "1", game: 1, scores: [10, 21] }), swapped]);
    expect(issues).toEqual([]);
    expect(sessions[0].matches[0].games.map((g) => g.scores)).toEqual([[10, 21], [15, 21]]);
  });

  it("rejects a game in a match with different players", () => {
    const { issues } = plan([row({ match: "1", game: 1 }), row({ match: "1", game: 2, sides: [["Jus"], ["Far"]] })]);
    expect(issues).toEqual([{ path: ["rows", 1, "sides"], message: "Different players from the rest of match 1 (row 1)" }]);
  });

  it("rejects the same game number twice in one match", () => {
    const { issues } = plan([row({ match: "1", game: 1 }), row({ match: "1", game: 1 })]);
    expect(issues).toEqual([{ path: ["rows", 1, "game"], message: "Game 1 of match 1 is also row 1" }]);
  });

  it("reports every problem at once", () => {
    const { issues } = plan([
      row({ sides: [["Soong", "Soong"], ["Nad"]] }),
      row({ sides: [["Nobody"], ["Nad"]] }),
      row({ videoUrl: "https://youtu.be/xxxxxxxxxx1" }),
      row({ videoUrl: "https://www.youtube.com/watch?v=xxxxxxxxxx1&t=3" }),
    ]);
    expect(issues.map((i) => i.path.join("."))).toEqual(["rows.0.sides", "rows.1.sides", "rows.3.videoUrl"]);
  });

  it("leaves skipped rows out, and does not hold them to the rules", () => {
    const { sessions, issues } = plan([row({ sides: [["Nobody"], ["Nad"]] }), row()], [0]);
    expect(issues).toEqual([]);
    expect(sessions[0].matches.map((m) => m.games.map((g) => g.row))).toEqual([[1]]);
  });
});

describe("rows with no players", () => {
  const clip = (over: Partial<ImportRow> = {}): ImportRow => ({ date: "2026-10-24", label: "A point of view", videoUrl: `https://youtu.be/${String(++n).padStart(11, "c")}`, ...over });

  it("are videos of their session, not games, and need no names", () => {
    const { sessions, issues } = plan([row(), clip(), clip()]);
    expect(issues).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].matches).toHaveLength(1);
    expect(sessions[0].videos).toEqual([1, 2]);
  });

  it("can make a session with no match, and follow the session column", () => {
    const { sessions } = plan([row(), clip({ date: "2026-10-26" }), clip({ session: "Night" })]);
    expect(sessions.map((s) => [s.label, s.row, s.matches.length, s.videos])).toEqual([
      ["24 Oct 2026", 0, 1, []],
      ["26 Oct 2026", 1, 0, [1]],
      ["Night", 2, 0, [2]],
    ]);
  });

  it("are left out when skipped, and the same video twice is still a mistake", () => {
    expect(plan([clip({ date: "2026-10-26" })], [0]).sessions).toEqual([]);
    const same = "https://youtu.be/zzzzzzzzzzz";
    expect(plan([row({ videoUrl: same }), clip({ videoUrl: same })]).issues.map((i) => i.path)).toEqual([["rows", 1, "videoUrl"]]);
  });

  it("pass through the merging of names untouched", () => {
    const merged = mergeAliases([clip(), row()], [{ name: "Soong", accountId: "a" }]);
    expect(merged.rows[0]).not.toHaveProperty("sides");
  });
});

describe("rows whose video is already saved", () => {
  const SESSION = "s1";
  const sessionIdOf = () => SESSION;
  const placed = (matchLabel: string, gameNumber: number, sessionId = SESSION) => ({ sessionId, sessionLabel: "24 Oct 2026", date: "2026-10-24", matchLabel, gameNumber });
  const classify = (rows: ImportRow[], video: Partial<KnownVideo>, session: (row: ImportRow) => string | undefined = sessionIdOf) =>
    classifyKnownVideos(rows, new Map([[0, { id: "v1", games: [], pools: [], ...video }]]), session);
  const clip = (): ImportRow => ({ date: "2026-10-24", label: "A view", videoUrl: "https://youtu.be/yyyyyyyyyyy" });

  it("leaves a row out when its video is already in the row's game", () => {
    expect(classify([row({ match: "1", game: 2 })], { games: [placed("Match 1", 2)] }).skip).toEqual(new Set([0]));
    expect(classify([row()], { games: [placed("Game 3", 1)] }).skip).toEqual(new Set([0]));
  });

  it("links a saved video that is in no game to the game its row names", () => {
    const { skip, reuse, issues } = classify([row({ match: "1", game: 1 })], { pools: [SESSION] });
    expect([skip.size, reuse.get(0), issues]).toEqual([0, "v1", []]);
  });

  it("says where the video is when it is in a different game, in another match, number or session", () => {
    const other = (v: Partial<KnownVideo>, r: ImportRow = row({ match: "1", game: 1 })) => classify([r], v).issues.map((i) => i.message);
    const where = "24 Oct 2026, Match 2, game 1";
    expect(other({ games: [placed("Match 2", 1)] })).toEqual([`This video is already in ${where}. Change it there, or delete that session and import again.`]);
    expect(other({ games: [placed("Match 1", 2)] })[0]).toContain("Match 1, game 2");
    expect(other({ games: [placed("Match 1", 1, "s2")] })).toHaveLength(1);
    expect(other({ games: [placed("Match 1", 1)] }, row())).toHaveLength(1);
  });

  it("treats a video with no game as in its session when the pool holds it, and adds it when not", () => {
    expect(classify([clip()], { pools: [SESSION] }).skip).toEqual(new Set([0]));
    expect(classify([clip()], { pools: ["other"] }).reuse.get(0)).toBe("v1");
    expect(classify([clip()], { games: [placed("Match 1", 1)], pools: [SESSION] }).issues).toEqual([]);
    expect(classify([clip()], {}, () => undefined).reuse.get(0)).toBe("v1");
  });
});
