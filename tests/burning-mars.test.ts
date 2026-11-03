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
      csv(`2026-10-24,,1,24 Oct SoongJit vs NadIan Game 1,${URL1}`, `2026-10-24,Night,1,24 Oct NadIan vs JitSoong 2,${URL2}`),
    );
    expect(problems).toEqual([]);
    expect(rows[0]).toEqual({
      date: "2026-10-24",
      match: "1",
      game: 1,
      label: "24 Oct SoongJit vs NadIan Game 1",
      videoUrl: URL1,
      sides: [["Soong", "Jit"], ["Nad", "Ian"]],
    });
    expect(rows[1]).toMatchObject({ session: "Night", match: "1", game: 2, sides: [["Nad", "Ian"], ["Jit", "Soong"]] });
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
    expect(rows).toHaveLength(4);
  });

  it("reads kind video as a video with no game, whatever the title says", () => {
    const { rows, names, problems } = adaptBurningMars(
      "date,session,match,title,url,kind\n" + `2026-10-24,Night,,Practice with no players named,${URL1},Video\n` + `2026-10-24,,,24 Oct Soong vs Nad,${URL2},game\n`,
    );
    expect(problems).toEqual([]);
    expect(rows[0]).toEqual({ date: "2026-10-24", session: "Night", label: "Practice with no players named", videoUrl: URL1 });
    expect(rows[1].sides).toEqual([["Soong"], ["Nad"]]);
    expect(names).toEqual(["Soong", "Nad"]);
  });

  it("still holds a game to its title, and turns down a video with a match, a game number or an unknown kind", () => {
    const { problems } = adaptBurningMars(
      "date,session,match,game,title,url,kind\n" +
        `2026-10-24,,,,Practice,${URL1},\n` +
        `2026-10-24,,1,,Practice,${URL1},video\n` +
        `2026-10-24,,,2,Practice,${URL1},video\n` +
        `2026-10-24,,,,Practice,${URL1},clip\n`,
    );
    expect(problems.map((p) => [p.line, p.field])).toEqual([[2, "title"], [3, "match"], [4, "game"], [5, "kind"]]);
  });

  it("takes the game number from the game column, or the end of the title, and they must agree", () => {
    const read = (match: string, game: string, title: string) =>
      adaptBurningMars(`date,match,game,title,url\n2026-10-24,${match},${game},${title},${URL1}\n`);
    for (const title of ["24 Oct Soong vs Nad Game 3", "24 Oct Soong vs Nad (Game 3)", "24 Oct Soong vs Nad 3"]) {
      expect(read("1", "", title).rows[0]).toMatchObject({ match: "1", game: 3, sides: [["Soong"], ["Nad"]], label: title });
    }
    expect(read("1", "3", "24 Oct Soong vs Nad").rows[0]).toMatchObject({ match: "1", game: 3 });
    expect(read("1", "3", "24 Oct Soong vs Nad Game 3").problems).toEqual([]);
    expect(read("1", "2", "24 Oct Soong vs Nad Game 3").problems[0]).toMatchObject({ line: 2, field: "game", message: "The title says game 3 and the game column says 2" });
  });

  it("asks for a whole game number, and for one only in a match", () => {
    const problemsOf = (match: string, game: string, title = "24 Oct Soong vs Nad") =>
      adaptBurningMars(`date,match,game,title,url\n2026-10-24,${match},${game},${title},${URL1}\n`).problems.map((p) => [p.field, p.message]);
    expect(problemsOf("1", "")).toEqual([["game", 'Match 1 needs a game number. Write it in the game column, or end the title with "Game 2"']]);
    expect(problemsOf("1", "2.5")).toEqual([["game", "Write the game number as a whole number from 1, for example 2"]]);
    expect(problemsOf("1", "0")).toEqual([["game", "Write the game number as a whole number from 1, for example 2"]]);
    expect(problemsOf("", "2")).toEqual([["match", "Game 2 needs a match name or number. A game on its own has no game number"]]);
    expect(problemsOf("", "", "24 Oct Soong vs Nad Game 2")).toEqual([["match", "Game 2 needs a match name or number. A game on its own has no game number"]]);
  });

  it("names a column it does not know, or one that is there twice, so no value is lost", () => {
    expect(adaptBurningMars(`date,mach,title,url\n2026-10-24,1,24 Oct Soong vs Nad,${URL1}\n`).problems).toEqual([
      { line: 1, field: "mach", message: expect.stringContaining('Unknown column "mach"') },
    ]);
    expect(adaptBurningMars(`date,title,url,date\n2026-10-24,24 Oct Soong vs Nad,${URL1},2026-10-25\n`).problems).toEqual([
      { line: 1, field: "date", message: 'The column "date" appears twice.' },
    ]);
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

  it("holds the rows together to the rules that need no names, in lines of the file", () => {
    const { problems } = adaptBurningMars(
      csv(
        `2026-10-24,,,24 Oct SoongJit vs NadIan,${URL1}`,
        `2026-10-24,,,24 Oct Soong vs Soong,https://youtu.be/CCCCCCCCCCC`,
        `2026-10-24,,,24 Oct Far vs Nad,${URL1}`,
      ),
    );
    expect(problems.map((p) => [p.line, p.field, p.message])).toEqual([
      [3, "sides", "A player appears twice in one game. Two names for one person count as the same player."],
      [4, "videoUrl", "Same video as line 2"],
    ]);
  });

  it("accepts a comments column and never reads it", () => {
    const { rows, problems } = adaptBurningMars(
      `date,match,game,title,url,kind,comments
2026-10-24,1,1,24 Oct Soong vs Nad,${URL1},,"numbered by guess, check it"
2026-10-24,,,Top view,${URL2},video,another angle
`,
    );
    expect(problems).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(JSON.stringify(rows)).not.toContain("guess");
  });

  it("stops at a row with no date, so a comment on it has to be dealt with", () => {
    const { problems } = adaptBurningMars(`date,title,url,kind,comments
,Some title,${URL1},video,no upload date. Write the date
`);
    expect(problems.map((p) => [p.line, p.field])).toEqual([[2, "date"]]);
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
