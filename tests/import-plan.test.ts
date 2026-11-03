import { describe, expect, it } from "vitest";
import type { ImportRow } from "../src/contract";
import { dateLabel, formatFor, heldKey, matchTypeFor, planImport } from "../src/server/import-plan";

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

describe("planning an import", () => {
  it("makes each row with no match number a game on its own, in file order", () => {
    const { sessions, issues } = plan([row(), row({ sides: [["Jus"], ["Far"]] })]);
    expect(issues).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].matches.map((m) => [m.format, m.matchType, m.games.length])).toEqual([["BO1", "MD", 1], ["BO1", "MS", 1]]);
  });

  it("groups rows with the same match number, in row order, and picks the format from their count", () => {
    const { sessions, issues } = plan([row({ match: "1" }), row(), row({ match: "1" })]);
    expect(issues).toEqual([]);
    // The match is placed where its first row is. The game on its own comes after it.
    expect(sessions[0].matches.map((m) => [m.format, m.games.map((g) => g.row)])).toEqual([["BO3", [0, 2]], ["BO1", [1]]]);
  });

  it("counts the same match number in another session as another match", () => {
    const { sessions } = plan([row({ match: "1" }), row({ match: "1", date: "2026-10-25" })]);
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

  it("adds a row to the saved match with its number, and numbers its games on", () => {
    const held = new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: [["Soong", "Jit"], ["Nad", "Ian"]] as [string[], string[]], games: 1, format: "BO1" as const }]]);
    const { sessions, issues } = planImport([row({ match: "1", sides: [["Ian", "Nad"], ["Jit", "Soong"]], scores: [21, 9] })], new Set(), known, held);
    expect(issues).toEqual([]);
    const [match] = sessions[0].matches;
    // One game was there, so the match grows to Best of 3. The scores follow the saved sides.
    expect([match.key, match.heldGames, match.format, match.games.map((g) => g.scores)]).toEqual(["1", 1, "BO3", [[9, 21]]]);
  });

  it("keeps the saved format while the games fit, grows it when they do not, and obeys a format the sheet names", () => {
    const side: [string[], string[]] = [["Soong"], ["Nad"]];
    const held = (games: number) => new Map([[heldKey("2026-10-24", "24 Oct 2026", "1"), { sides: side, games, format: "BO3" as const }]]);
    const one = (games: number, format?: ImportRow["format"]) => planImport([row({ match: "1", sides: side, format })], new Set(), known, held(games));
    expect(one(1).sessions[0].matches[0].format).toBe("BO3");
    expect(one(3).sessions[0].matches[0].format).toBe("BO5");
    expect(one(3, "BO3").issues).toEqual([{ path: ["rows", 0, "format"], message: "Match 1 has more games than BO3 allows" }]);
  });

  it("lets the sides swap between games and swaps the scores with them", () => {
    const swapped = row({ match: "1", sides: [["Nad", "Ian"], ["Jit", "Soong"]], scores: [21, 15] });
    const { sessions, issues } = plan([row({ match: "1", scores: [10, 21] }), swapped]);
    expect(issues).toEqual([]);
    expect(sessions[0].matches[0].games.map((g) => g.scores)).toEqual([[10, 21], [15, 21]]);
  });

  it("rejects a game in a match with different players", () => {
    const { issues } = plan([row({ match: "1" }), row({ match: "1", sides: [["Jus"], ["Far"]] })]);
    expect(issues).toEqual([{ path: ["rows", 1, "sides"], message: "Different players from the rest of match 1" }]);
  });

  it("obeys an explicit format, and rejects more games than it allows", () => {
    expect(plan([row({ match: "1", format: "FREE" }), row({ match: "1" })]).sessions[0].matches[0].format).toBe("FREE");
    const { issues } = plan([row({ match: "1", format: "BO1" }), row({ match: "1" })]);
    expect(issues.map((i) => i.path)).toEqual([["rows", 1, "format"]]);
  });

  it("rejects a game with no match number that asks for a longer format", () => {
    expect(plan([row({ format: "BO3" })]).issues.map((i) => i.path)).toEqual([["rows", 0, "format"]]);
  });

  it("reports every problem at once", () => {
    const { issues } = plan([
      row({ sides: [["Soong", "Soong"], ["Nad"]] }),
      row({ sides: [["Nobody"], ["Nad"]] }),
      row({ videoUrl: "https://youtu.be/xxxxxxxxxx1" }),
      row({ videoUrl: "https://www.youtube.com/watch?v=xxxxxxxxxx1&t=3" }),
    ]);
    expect(issues.map((i) => i.path.join("."))).toEqual(["rows.3.videoUrl", "rows.0.sides", "rows.1.sides"]);
  });

  it("leaves skipped rows out, and does not hold them to the rules", () => {
    const { sessions, issues } = plan([row({ sides: [["Nobody"], ["Nad"]] }), row()], [0]);
    expect(issues).toEqual([]);
    expect(sessions[0].matches.map((m) => m.games.map((g) => g.row))).toEqual([[1]]);
  });
});
