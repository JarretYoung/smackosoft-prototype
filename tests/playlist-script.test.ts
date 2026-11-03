import { describe, expect, it } from "vitest";
import { groupMatches, loadNames, parseTitle, yearFor } from "../scripts/playlist-to-csv.mjs";

const names = loadNames();
const read = (title: string) => parseTitle(title, names);

describe("reading a playlist title", () => {
  it("reads the game number, from the end of the title, a Game label or brackets", () => {
    expect(read("6 Jul NadGar vs JusIan 3")).toMatchObject({ game: 3, part: null, sides: [["Gar", "Nad"], ["Ian", "Jus"]] });
    expect(read("November 28 Ian Vs Nad Game 8")).toMatchObject({ game: 8, part: null });
    expect(read("November 7 Ian Vs Sober Nad (Game 5)")).toMatchObject({ game: 5, sides: [["Ian"], ["Nad"]] });
    expect(read("Jan 12 NadChris Vs JusIan")).toMatchObject({ game: null });
    expect(read("(October 13) NadZaaq Vs IanJus 2 elongated")).toMatchObject({ game: 2 });
  });

  it("reads Game 4.1, Game 4.2 and Game 4 1 as parts of game 4", () => {
    expect(read("November 21 Nad Vs Ian Game 4.1")).toMatchObject({ game: 4, part: 1 });
    expect(read("November 21 Nad Vs Ian Game 4.2")).toMatchObject({ game: 4, part: 2 });
    expect(read("December 10 Nad Vs Ian Game 4 1")).toMatchObject({ game: 4, part: 1 });
  });

  it("says why it cannot read a title that is not a game", () => {
    expect(read("November 12 Pre Battle")).toMatchObject({ error: expect.stringContaining("vs") });
    expect(read("(June 1st) Nad-Jus Vs Ian-Gar [Top Pov]")).toMatchObject({ error: expect.stringContaining("bracketed") });
    expect(read("Every PewDiePie's Pet Death Compilation")).toMatchObject({ error: expect.stringContaining("day and month") });
  });

  it("puts a day written as late December in the year before an upload in January", () => {
    expect(yearFor(27, 11, new Date("2026-02-02"))).toBe(2025);
    expect(yearFor(24, 9, new Date("2026-10-25"))).toBe(2026);
  });
});

describe("putting the games of one day into matches", () => {
  let n = 0;
  const game = (over: Record<string, unknown> = {}) => ({
    sides: [["Gar", "Nad"], ["Ian", "Jus"]],
    game: null as number | null,
    uploaded: 1_000 * ++n,
    videoId: `v${String(n).padStart(3, "0")}`,
    ...over,
  });
  const shape = (rows: ReturnType<typeof game>[]) =>
    groupMatches(rows).flatMap((m: { name: string; games: { row: { videoId: string }; number: number }[] }) => m.games.map((g) => [g.row.videoId, m.name, g.number]));

  it("names a match after its two teams in letter order, whichever side a game lists first", () => {
    const first = game({ game: 1 });
    const swapped = game({ game: 2, sides: [["Ian", "Jus"], ["Gar", "Nad"]] });
    expect(shape([first, swapped])).toEqual([[first.videoId, "GarNad v IanJus", 1], [swapped.videoId, "GarNad v IanJus", 2]]);
  });

  it("starts a second series when a game number repeats", () => {
    const rows = [game({ game: 1 }), game({ game: 2 }), game({ game: 1 }), game({ game: 2 })];
    expect(groupMatches(rows).map((m: { name: string }) => m.name)).toEqual(["GarNad v IanJus", "GarNad v IanJus 2"]);
  });

  it("gives a game with no number the lowest number the match has free, and marks it as a guess", () => {
    expect(shape([game({ game: 2 }), game()]).map((x) => x[2]).sort()).toEqual([1, 2]);
    const two = groupMatches([game(), game()]);
    expect(two[0].games.map((g: { number: number }) => g.number)).toEqual([1, 2]);
    expect(two[0].games.map((g: { guessed?: boolean }) => g.guessed)).toEqual([true, true]);
    // A game that has its number is not a guess, and neither is a game with no number that is alone in its match.
    expect(groupMatches([game({ game: 4 })])[0].games[0].guessed).toBeUndefined();
    expect(groupMatches([game()])[0].games[0]).toMatchObject({ number: 1, guessed: false });
    // With a numbered game in the match, the unnumbered one took the free number, so that was a choice.
    expect(groupMatches([game({ game: 1 }), game()])[0].games.map((g: { guessed?: boolean }) => g.guessed)).toEqual([undefined, true]);
  });

  it("never changes what an earlier video got when later videos arrive", () => {
    const early = [game({ game: 1 }), game({ game: 2 }), game({ game: 1, sides: [["Far"], ["Jit"]] })];
    const before = shape(early);
    // Uploaded later: the next game of the series, a restart of the numbers, another pair, and a game with no number.
    const later = [game({ game: 3 }), game({ game: 1 }), game({ game: 1, sides: [["Dam"], ["Zard"]] }), game()];
    const after = shape([...early, ...later]);
    for (const entry of before) expect(after).toContainEqual(entry);
  });

  it("can move an earlier game that had no number when a later video is titled with its number, which the import then refuses", () => {
    const first = game({ game: 1 });
    const guessed = game();
    expect(shape([first, guessed])).toContainEqual([guessed.videoId, "GarNad v IanJus", 2]);
    const claimed = game({ game: 2 });
    expect(shape([first, guessed, claimed])).toContainEqual([guessed.videoId, "GarNad v IanJus", 3]);
  });

  it("gives the same result whatever order the rows are listed in", () => {
    const rows = [game({ game: 1 }), game({ game: 2 }), game({ game: 1 }), game(), game({ game: 1, sides: [["Far"], ["Jit"]] })];
    expect([...shape(rows)].sort()).toEqual([...shape([...rows].reverse())].sort());
  });
});
