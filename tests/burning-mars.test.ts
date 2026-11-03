import { describe, expect, it } from "vitest";
import { adaptBurningMars, BURNING_MARS_TEMPLATE, namesIn } from "../src/features/imports/burning-mars";

const csv = (...lines: string[]) => ["date,session,match,title,url", ...lines].join("\n");
const URL1 = "https://youtu.be/AAAAAAAAAAA";
const URL2 = "https://youtu.be/BBBBBBBBBBB";

describe("reading names out of a title", () => {
  it("splits on capital letters", () => {
    expect(namesIn("SoongJit")).toEqual(["Soong", "Jit"]);
    expect(namesIn("Far")).toEqual(["Far"]);
    expect(namesIn("NadIan")).toEqual(["Nad", "Ian"]);
  });

  it("gives up on anything that is not names with capitals", () => {
    expect(namesIn("soongjit")).toBeNull();
    expect(namesIn("nadIan")).toBeNull();
    expect(namesIn("Soong Jit")).toBeNull();
    expect(namesIn("Soong2")).toBeNull();
  });
});

describe("the BurningMars playlist file", () => {
  it("turns titles into two sides and lists the names once, in order", () => {
    const { rows, names, lines, problems } = adaptBurningMars(
      csv(`2026-10-24,,1,24 Oct SoongJit vs NadIan,${URL1}`, `2026-10-24,Night,1,24 Oct NadIan vs JitSoong,${URL2}`),
    );
    expect(problems).toEqual([]);
    expect(rows[0]).toEqual({ date: "2026-10-24", match: "1", label: "24 Oct SoongJit vs NadIan", videoUrl: URL1, sides: [["Soong", "Jit"], ["Nad", "Ian"]] });
    expect(rows[1]).toMatchObject({ session: "Night", sides: [["Nad", "Ian"], ["Jit", "Soong"]] });
    expect(names).toEqual(["Soong", "Jit", "Nad", "Ian"]);
    expect(lines).toEqual([2, 3]);
  });

  it("reads a title with no date in front, and any case of vs", () => {
    const { rows, problems } = adaptBurningMars(csv(`2026-10-24,,,SoongJit VS NadIan,${URL1}`));
    expect(problems).toEqual([]);
    expect(rows[0].sides).toEqual([["Soong", "Jit"], ["Nad", "Ian"]]);
  });

  it("accepts the template as it is", () => {
    const { rows, problems } = adaptBurningMars(BURNING_MARS_TEMPLATE);
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(3);
  });

  it("copes with columns in any order, a byte order mark, blank lines and Windows line endings", () => {
    const text = `﻿url,Title,DATE\r\n${URL1},24 Oct Far vs Jus,2026-10-24\r\n\r\n${URL2},24 Oct Far vs Nad,2026-10-24\r\n`;
    const { rows, problems, lines } = adaptBurningMars(text);
    expect(problems).toEqual([]);
    expect(rows.map((r) => r.sides)).toEqual([[["Far"], ["Jus"]], [["Far"], ["Nad"]]]);
    expect(lines).toEqual([2, 4]);
  });

  it("lists every problem with its line, and gives no rows to import a half-read file", () => {
    const { problems } = adaptBurningMars(
      csv(
        `24/10/2026,,,24 Oct SoongJit vs NadIan,${URL1}`,
        `2026-10-24,,,24 Oct soongjit vs NadIan,${URL1}`,
        `2026-10-24,,,24 Oct SoongJit vs NadIan,not a link`,
        `2026-10-24,,,24 Oct SoongJit vs NadIan,${URL2}`,
      ),
    );
    expect(problems.map((p) => [p.line, p.field])).toEqual([[2, "date"], [3, "title"], [4, "url"]]);
  });

  it("says what is missing from the header", () => {
    expect(adaptBurningMars("date,title\n2026-10-24,x").problems).toEqual([
      { line: 1, field: "url", message: expect.stringContaining("url") },
    ]);
  });

  it("says so when there is nothing to import", () => {
    expect(adaptBurningMars("date,title,url\n").problems).toHaveLength(1);
  });
});
