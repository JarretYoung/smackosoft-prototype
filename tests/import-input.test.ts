import { describe, expect, it } from "vitest";
import type { Account } from "../src/contract";
import { alsoCalled, guestsFromFile, type Choice } from "../src/features/imports/import-input";

const account = (id: string): Choice => ({ kind: "account", account: { id, displayName: id, handle: id } as Account });
const guest = (handle: string): Choice => ({ kind: "guest", displayName: handle, handle });

describe("names that mean one person", () => {
  const names = ["Wen", "Soong", "Nad", "Ian"];

  it("finds the other names linked to the same account", () => {
    const choices = { Wen: account("a"), Soong: account("a"), Nad: account("b"), Ian: guest("ian") };
    expect(alsoCalled("Wen", names, choices)).toEqual(["Soong"]);
    expect(alsoCalled("Soong", names, choices)).toEqual(["Wen"]);
    expect(alsoCalled("Nad", names, choices)).toEqual([]);
  });

  it("finds names given the same new guest handle, whatever the case", () => {
    const choices = { Wen: guest("wensoong"), Soong: guest("WenSoong"), Nad: account("b"), Ian: guest("ian") };
    expect(alsoCalled("Wen", names, choices)).toEqual(["Soong"]);
  });

  it("offers each other new guest once, by handle", () => {
    const choices = { Wen: guest("wen"), Soong: guest("soong"), Nad: guest("soong"), Ian: account("b") };
    expect(guestsFromFile("Wen", names, choices).map((g) => [g.name, g.choice.handle])).toEqual([["Soong", "soong"]]);
    expect(guestsFromFile("Ian", names, choices).map((g) => g.name)).toEqual(["Wen", "Soong"]);
  });
});
