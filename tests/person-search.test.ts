import { describe, expect, it } from "vitest";
import { fit, rankPeople } from "../src/features/people/search";

const person = (displayName: string, handle: string) => ({ displayName, handle });
const people = [person("Nadree Aziz", "nadree"), person("Garret Lim", "garret"), person("Gar", "guest_gar_1a2b"), person("Ian Chong", "ianczm"), person("Anna", "agarwal")];

describe("finding people by what was typed", () => {
  it("puts a name that is the text before one that starts with it, then a word, then a part", () => {
    const names = (text: string) => rankPeople(people, text).map((p) => p.displayName);
    expect(names("gar")).toEqual(["Gar", "Garret Lim", "Anna"]);
    expect(names("lim")).toEqual(["Garret Lim"]);
    expect(names("rre")).toEqual(["Garret Lim"]);
  });

  it("finds a handle, with or without the @, a little behind the name", () => {
    expect(rankPeople(people, "@garret").map((p) => p.handle)).toEqual(["garret"]);
    expect(rankPeople(people, "ianc").map((p) => p.handle)).toEqual(["ianczm"]);
    expect(fit(person("Zed", "garret"), "garret")).toBe(1);
  });

  it("keeps the order it was given when the fit is equal, so a list sorted by use stays sorted", () => {
    const list = [person("Ben Tan", "bt1"), person("Ben Lee", "bl2"), person("Bena", "bena")];
    expect(rankPeople(list, "ben").map((p) => p.handle)).toEqual(["bt1", "bl2", "bena"]);
  });

  it("returns everyone, in order, for nothing typed, and no one for text nobody fits", () => {
    expect(rankPeople(people, "  ")).toEqual(people);
    expect(rankPeople(people, "zzz")).toEqual([]);
  });
});
