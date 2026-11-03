import { describe, expect, it } from "vitest";
import type { Account } from "../src/contract";
import { parseDraft } from "../src/features/imports/import-draft";
import { applyNewGuests, defaultChoices, guestsFromFile, whoIsWho, type Choice } from "../src/features/imports/import-input";

const account = (id: string): Choice => ({ kind: "account", account: { id, displayName: id, handle: id } as Account });
const guest = (handle: string): Choice => ({ kind: "guest", displayName: handle, handle });
const gamesOf = (counts: Record<string, number>) => (name: string) => counts[name] ?? 0;

describe("names that mean one person", () => {
  const names = ["Wen", "Soong", "Nad", "Ian"];
  const games = gamesOf({ Wen: 5, Soong: 9, Nad: 20, Ian: 1 });

  it("lists one entry per person, with every name that means them, most games first", () => {
    const choices = { Wen: account("a"), Soong: account("a"), Nad: account("b"), Ian: guest("ian") };
    const people = whoIsWho(names, choices, games);
    expect(people.map((p) => [p.displayName, p.names, p.games])).toEqual([
      ["b", ["Nad"], 20],
      ["a", ["Soong", "Wen"], 14],
      ["ian", ["Ian"], 1],
    ]);
    expect(people.map((p) => p.account === null)).toEqual([false, false, true]);
  });

  it("joins names given the same new guest handle, whatever the case", () => {
    const choices = { Wen: guest("wensoong"), Soong: guest("WenSoong"), Nad: account("b"), Ian: guest("ian") };
    expect(whoIsWho(names, choices, games).find((p) => p.account === null && p.names.length > 1)?.names).toEqual(["Soong", "Wen"]);
  });

  it("offers each other new guest once, by handle", () => {
    const choices = { Wen: guest("wen"), Soong: guest("soong"), Nad: guest("soong"), Ian: account("b") };
    expect(guestsFromFile("Wen", names, choices).map((g) => [g.name, g.choice.handle])).toEqual([["Soong", "soong"]]);
    expect(guestsFromFile("Ian", names, choices).map((g) => g.name)).toEqual(["Wen", "Soong"]);
  });
});

describe("changing the files of an import in progress", () => {
  const known = [{ id: "a", displayName: "Ann", handle: "ann" } as Account];

  it("keeps what was chosen for names that stay, guesses new names, and drops names that left", () => {
    const chosen = { Wen: account("b"), Gone: guest("gone") };
    const next = defaultChoices(["Wen", "Ann", "Zed"], known, chosen);
    expect(next.Wen).toBe(chosen.Wen);
    expect(next.Ann).toMatchObject({ kind: "account", account: { id: "a" } });
    expect(next.Zed).toMatchObject({ kind: "guest", displayName: "Zed" });
    expect(Object.keys(next)).toEqual(["Wen", "Ann", "Zed"]);
  });
});

describe("an import kept in the browser", () => {
  const draft = { files: [{ name: "a.csv", text: "x" }], choices: {}, asked: ["Nad"], zone: "Asia/Kuala_Lumpur", step: "people" };

  it("reads back what was saved and ignores anything else", () => {
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, files: [] }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, step: "preview" }))).toBeNull();
  });
});

describe("linking the next file to the guests the last one made", () => {
  it("turns each name given a made guest into that account, whatever the case of the handle, and leaves the rest", () => {
    const choices = { Wen: guest("wensoong"), Soong: guest("WenSoong"), Nad: account("b"), Ian: guest("ian") };
    const next = applyNewGuests(choices, [{ handle: "wensoong", accountId: "id-1" }]);
    expect(next.Wen).toMatchObject({ kind: "account", account: { id: "id-1", isGuest: true, handle: "wensoong" } });
    expect(next.Soong).toMatchObject({ kind: "account", account: { id: "id-1" } });
    expect(next.Nad).toBe(choices.Nad);
    expect(next.Ian).toBe(choices.Ian);
    // Two names for one person stay one person.
    expect(whoIsWho(Object.keys(next), next, gamesOf({})).find((p) => p.names.includes("Wen"))?.names).toEqual(["Wen", "Soong"]);
  });
});
