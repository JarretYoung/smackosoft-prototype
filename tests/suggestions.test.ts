import { describe, expect, it } from "vitest";
import type { ImportRow } from "../src/contract";
import { byLikeness, likeness, listOf, nameFacts, playedBetween } from "../src/features/imports/suggestions";

const person = (displayName: string, handle: string) => ({ displayName, handle });

describe("which person a name from the file is likely to mean", () => {
  it("is surest for a whole word of the name or the handle, then a start, then one letter off", () => {
    expect(likeness("Ian", person("Ian Chong", "ianczm"))).toBe(0);
    expect(likeness("Nad", person("Nadree Omar", "nadree"))).toBe(1);
    expect(likeness("Nadree", person("Nad Ahmad", "nad"))).toBe(1);
    expect(likeness("Gar", person("Garret Lim", "garret"))).toBe(1);
    expect(likeness("Zaq", person("Zaaq Izham", "izaaq"))).toBe(2);
    expect(likeness("Zaaq", person("Izaaq Izham", "izaaq"))).toBe(2);
    expect(likeness("Jus", person("Ian Chong", "ianczm"))).toBe(3);
  });

  it("does not guess from a short name, where one letter off is not a clue", () => {
    expect(likeness("Al", person("Ali Baba", "ali"))).toBe(1);
    expect(likeness("Jo", person("Bo Lim", "bo"))).toBe(3);
    // Two three letter names that differ by a letter are two people, not a typo.
    expect(likeness("Far", person("Gar Lim", "gar"))).toBe(3);
    expect(likeness("Zaq", person("Zaaq Izham", "zaaq"))).toBe(2);
  });

  it("puts the likely people first and keeps the rest in the order given", () => {
    const people = [person("Ben Tan", "ben"), person("Izaaq Izham", "izaaq"), person("Garret Lim", "garret"), person("Gary Koh", "gary")];
    expect(byLikeness(people, "Gar").map((p) => p.handle)).toEqual(["garret", "gary", "ben", "izaaq"]);
    expect(byLikeness(people, "Zaaq").map((p) => p.handle)).toEqual(["izaaq", "ben", "garret", "gary"]);
  });
});

describe("what the file says about a name", () => {
  const row = (date: string, a: string[], b: string[]): ImportRow => ({ date, label: "g", videoUrl: "https://youtu.be/x", sides: [a, b] });
  const rows = [
    row("2024-04-13", ["Gar", "Nad"], ["Ian", "Jus"]),
    row("2024-04-13", ["Ian", "Nad"], ["Gar", "Jus"]),
    row("2026-10-24", ["Gar", "Nad"], ["Ian", "Far"]),
    row("2025-01-05", ["Ian"], ["Jus"]),
    { date: "2025-02-01", label: "clip", videoUrl: "https://youtu.be/y" },
  ];

  it("counts the games, the first and last day, and the people it plays with and against", () => {
    expect(nameFacts(rows, "Gar")).toEqual({ games: 3, first: "2024-04-13", last: "2026-10-24", withNames: ["Nad", "Jus"], againstNames: ["Ian", "Far", "Jus"] });
    expect(nameFacts(rows, "Ian").withNames).toEqual(["Far", "Jus", "Nad"]);
    expect(nameFacts(rows, "Nobody")).toEqual({ games: 0, first: null, last: null, withNames: [], againstNames: [] });
  });

  it("says the months played, and lists people in words", () => {
    expect(playedBetween({ first: "2024-04-13", last: "2026-10-24" })).toBe("Apr 2024 to Oct 2026");
    expect(playedBetween({ first: "2024-04-13", last: "2024-04-20" })).toBe("Apr 2024");
    expect(playedBetween({ first: null, last: null })).toBe("");
    expect([listOf([]), listOf(["Nad"]), listOf(["Nad", "Ian"]), listOf(["Nad", "Ian", "Jus"])]).toEqual(["", "Nad", "Nad and Ian", "Nad, Ian and Jus"]);
  });
});
