import { describe, expect, it } from "vitest";
import type { ImportReport } from "../src/contract";
import { adaptBurningMars } from "../src/features/imports/burning-mars";
import { combineFiles, mergeReports, type LoadedFile } from "../src/features/imports/import-set";

const url = (n: number) => `https://youtu.be/${String(n).padStart(11, "s")}`;
const file = (name: string, ...lines: string[]): LoadedFile => {
  const text = ["date,session,match,game,title,url", ...lines].join("\n");
  return { name, text, adapted: adaptBurningMars(text) };
};

describe("a set of import files", () => {
  it("counts games, unlinked videos and sessions across files, and lists each name once", () => {
    const a = file("a.csv", `2026-10-24,,,,24 Oct Soong vs Nad,${url(1)}`, `2026-10-24,,,,24 Oct Ian vs Nad,${url(2)}`);
    const b = file("b.csv", `2026-10-25,,,,25 Oct Soong vs Ian,${url(3)}`);
    const set = combineFiles([a, b]);
    expect(set.problems).toEqual([]);
    expect(set.counts).toEqual({ games: 3, unlinked: 0, sessions: 2 });
    expect(set.names).toEqual(["Soong", "Nad", "Ian"]);
    expect(set.origin).toEqual([{ file: 0, line: 2 }, { file: 0, line: 3 }, { file: 1, line: 2 }]);
  });

  it("finds a video used in two files, and says which file and line", () => {
    const a = file("a.csv", `2026-10-24,,,,24 Oct Soong vs Nad,${url(1)}`);
    const b = file("b.csv", `2026-10-25,,,,25 Oct Soong vs Ian,${url(1)}`);
    expect(combineFiles([a, b]).problems).toEqual([
      { file: "b.csv", line: 2, field: "videoUrl", message: "Same video as a.csv line 2" },
    ]);
  });

  it("finds a game number used twice in one match, even when the two games are in different files", () => {
    const a = file("a.csv", `2026-10-24,,1,1,24 Oct Soong vs Nad,${url(1)}`);
    const b = file("b.csv", `2026-10-24,,1,1,24 Oct Soong vs Nad,${url(2)}`);
    expect(combineFiles([a, b]).problems).toEqual([
      { file: "b.csv", line: 2, field: "game", message: "Game 1 of match 1 is also a.csv line 2" },
    ]);
  });

  it("says it once when a copied row repeats both a video and its game", () => {
    const a = file("a.csv", `2026-10-24,,1,1,24 Oct Soong vs Nad,${url(1)}`);
    const b = file("b.csv", `2026-10-24,,1,1,24 Oct Soong vs Nad,${url(1)}`);
    expect(combineFiles([a, b]).problems.map((p) => p.field)).toEqual(["videoUrl"]);
  });

  it("names lines only, with no file name, when there is one file", () => {
    const only = file("a.csv", `2026-10-24,,,,24 Oct Soong vs Nad,${url(1)}`, `2026-10-24,,,,24 Oct Far vs Jus,${url(1)}`);
    expect(combineFiles([only]).problems[0].message).toBe("Same video as line 2");
  });

  it("keeps each file's own problems, with the file name, in file and line order", () => {
    const a = file("a.csv", `2026-10-24,,,,24 Oct Soong vs Nad,not a link`);
    const b = file("b.csv", `24/10/2026,,,,24 Oct Soong vs Nad,${url(2)}`);
    expect(combineFiles([a, b]).problems.map((p) => [p.file, p.line, p.field])).toEqual([["a.csv", 2, "url"], ["b.csv", 2, "date"]]);
  });

  it("turns down a file with more rows than one import takes", () => {
    const rows = Array.from({ length: 301 }, (_, i) => `2026-10-24,,,,24 Oct Soong vs Nad,${url(i + 1)}`);
    const { problems } = combineFiles([file("big.csv", ...rows)]);
    expect(problems).toEqual([
      { file: "big.csv", line: 1, field: "rows", message: "This file has 301 rows. The import takes 300 at a time, so split it between days." },
    ]);
  });
});

describe("putting the reports of several files together", () => {
  const report = (over: Partial<ImportReport["created"]>, handles = ["gar", "nad", "jus"], skipped: ImportReport["skipped"] = []): ImportReport => ({
    dryRun: true,
    sessions: [{ label: "24 Oct 2026", date: "2026-10-24", existing: false, matches: 1, games: 2, videos: 0 }],
    created: { sessions: 1, matches: 1, games: 2, videos: 2, unlinked: 0, guests: handles.length, ...over },
    skipped,
    newGuests: handles.map((handle) => ({ handle, accountId: handle })),
  });

  it("adds the counts, joins the sessions and gives skipped rows their file and line", () => {
    const merged = mergeReports([
      { file: "a.csv", lines: [2, 3], report: report({}, undefined, [{ row: 1, reason: "You already have this video" }]) },
      { file: "b.csv", lines: [2], report: report({ games: 5 }, ["gar", "ian"]) },
    ]);
    // The files share one guest (gar), which is made once: 3 + 2 would say 5, the true count is 4.
    expect(merged.created).toEqual({ sessions: 2, matches: 2, games: 7, videos: 4, unlinked: 0, guests: 4 });
    expect(merged.sessions).toHaveLength(2);
    expect(merged.skipped).toEqual([{ file: "a.csv", line: 3, reason: "You already have this video" }]);
  });
});
