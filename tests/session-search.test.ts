import { describe, expect, it } from "vitest";
import type { SessionListItem } from "../src/contract";
import { sessionSearch } from "../src/features/sessions/session-search";

const member = (displayName: string, handle: string, isGuest = false) => ({ id: handle, displayName, handle, avatarUrl: null, isGuest }) as never;
const session = (id: string, label: string, date: string, location: string | null, ...members: ReturnType<typeof member>[]): SessionListItem =>
  ({ id, label, date, timezone: "Asia/Kuala_Lumpur", startTime: null, endTime: null, location, coverUrl: null, gameCount: 0, myRole: "OWNER", members }) as SessionListItem;

const sessions = [
  session("a", "Badminton with da Laddies", "2026-11-01", null, member("Ian Chong", "ianczm"), member("Izaaq Izham", "izaaq")),
  session("b", "Last Week Doubles", "2026-10-27", "Subang Arena", member("Ian Chong", "ianczm"), member("Nadree", "guest_nadree_k3f9", true)),
  session("c", "Night session", "2025-10-24", "Cheras Courts", member("Jarret Young", "jayrome")),
];
const KL = "Asia/Kuala_Lumpur";
const ids = (query: string) => {
  const found = sessionSearch(sessions, KL)(query);
  return found && [...found].sort();
};

describe("searching sessions", () => {
  it("finds every session when nothing is typed", () => {
    expect(ids("")).toBeNull();
    expect(ids("   ")).toBeNull();
  });

  it("finds a name, a place, a member and a handle, and a start of a word", () => {
    expect(ids("laddies")).toEqual(["a"]);
    expect(ids("subang")).toEqual(["b"]);
    expect(ids("jarret")).toEqual(["c"]);
    expect(ids("@izaaq")).toEqual(["a"]);
    expect(ids("ia")).toEqual(["a", "b"]);
  });

  it("needs every word, each in any field", () => {
    expect(ids("ian oct")).toEqual(["b"]);
    expect(ids("ian nov")).toEqual(["a"]);
    expect(ids("ian subang")).toEqual(["b"]);
    expect(ids("ian cheras")).toEqual([]);
  });

  it("reads the day as words, and does not mix up years", () => {
    expect(ids("sunday")).toEqual(["a"]);
    expect(ids("tue 27")).toEqual(["b"]);
    expect(ids("2026")).toEqual(["a", "b"]);
    expect(ids("2025")).toEqual(["c"]);
  });

  it("forgives a wrong letter in a long word but not in a number", () => {
    expect(ids("subag")).toEqual(["b"]);
    expect(ids("2024")).toEqual([]);
  });

  it("does not search a guest's made up handle", () => {
    expect(ids("guest_nadree")).toEqual([]);
    expect(ids("nadree")).toEqual(["b"]);
  });
});
