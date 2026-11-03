import { describe, expect, it } from "vitest";
import type { ImportRow } from "../src/contract";
import { checkImportRows, checkMatchPlayers } from "../src/lib/import-rules";

let n = 0;
const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  date: "2026-10-24",
  label: "A game",
  videoUrl: `https://youtu.be/${String(++n).padStart(11, "r")}`,
  sides: [["Soong", "Jit"], ["Nad", "Ian"]],
  ...over,
});
const paths = (rows: ImportRow[], skip: number[] = []) => checkImportRows(rows, undefined, new Set(skip)).map((i) => i.path.join("."));
const playerPaths = (rows: ImportRow[], skip: number[] = []) => checkMatchPlayers(rows, undefined, new Set(skip)).map((i) => i.path.join("."));

describe("the rules about the rows of one file", () => {
  it("accepts games, with the sides swapped between the games of a match", () => {
    const swapped = row({ match: "1", game: 2, sides: [["Nad", "Ian"], ["Jit", "Soong"]] });
    expect(paths([row({ match: "1", game: 1 }), swapped, row()])).toEqual([]);
  });

  it("names the other row when a video or a game number repeats", () => {
    const same = "https://youtu.be/zzzzzzzzzzz";
    const issues = checkImportRows(
      [row({ match: "1", game: 1 }), row({ match: "1", game: 1 }), row({ videoUrl: same }), row({ videoUrl: same })],
      (index) => `line ${index + 2}`,
    );
    expect(issues).toEqual([
      { path: ["rows", 3, "videoUrl"], message: "Same video as line 4" },
      { path: ["rows", 1, "game"], message: "Game 1 of match 1 is also line 2" },
    ]);
  });

  it("keeps a match inside its session, so one name in another session is another match", () => {
    const other = row({ match: "1", game: 1, date: "2026-10-25" });
    expect(paths([row({ match: "1", game: 1 }), other, row({ match: "1", game: 1, session: "Night" })])).toEqual([]);
  });

  it("turns down a name on both sides, or twice on one side", () => {
    expect(paths([row({ sides: [["Soong"], ["Soong"]] }), row({ sides: [["Soong", "Soong"], ["Nad"]] })])).toEqual(["rows.0.sides", "rows.1.sides"]);
  });

  it("holds skipped rows to nothing but the same video twice", () => {
    expect(paths([row({ sides: [["Soong"], ["Soong"]] })], [0])).toEqual([]);
  });

  it("leaves a video with no players out of the rules about games", () => {
    const clip: ImportRow = { date: "2026-10-24", label: "A point of view", videoUrl: "https://youtu.be/ccccccccccc" };
    expect(paths([clip, row()])).toEqual([]);
  });
});

describe("the rule that one match is one pair of teams", () => {
  it("accepts the same teams in either order, and names the first row when they differ", () => {
    const rows = [row({ match: "1", game: 1 }), row({ match: "1", game: 2, sides: [["Nad", "Ian"], ["Jit", "Soong"]] }), row({ match: "1", game: 3, sides: [["Jus"], ["Far"]] })];
    expect(checkMatchPlayers(rows, (index) => `line ${index + 2}`)).toEqual([
      { path: ["rows", 2, "sides"], message: "Different players from the rest of match 1 (line 2)" },
    ]);
  });

  it("judges names as they are given, so two names for one person are for the caller to merge first", () => {
    const rows = [row({ match: "1", game: 1, sides: [["Wen"], ["Bob"]] }), row({ match: "1", game: 2, sides: [["Bob"], ["Soong"]] })];
    expect(playerPaths(rows)).toEqual(["rows.1.sides"]);
    expect(playerPaths(rows.map((r) => ({ ...r, sides: r.sides!.map((side) => side.map((name) => (name === "Soong" ? "Wen" : name))) as [string[], string[]] })))).toEqual([]);
  });

  it("only compares rows of the same match, in the same session", () => {
    const rows = [row({ match: "1", game: 1 }), row({ match: "2", game: 1, sides: [["Jus"], ["Far"]] }), row({ match: "1", game: 1, date: "2026-10-25", sides: [["Jus"], ["Far"]] }), row()];
    expect(playerPaths(rows)).toEqual([]);
  });
});
