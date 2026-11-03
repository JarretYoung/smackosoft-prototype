import { describe, expect, it } from "vitest";
import { matchPlayerIds, playersOf, withAllOf } from "../src/features/sessions/match-players";

const player = (id: string) => ({ id, displayName: id, handle: id, avatarUrl: null });
const match = (...sides: string[][]) => ({ teams: sides.map((ids) => ({ players: ids.map((id) => player(id)) })) }) as never;

describe("filtering games and matches by player", () => {
  const matches = [match(["ian", "jit"], ["nad", "wen"]), match(["ian", "far"], ["jit", "nad"]), match(["ian", "nad"], ["jus", "wen"])];

  it("lists each player once, the one in the most matches first", () => {
    expect(playersOf(matches).map((p) => p.id)).toEqual(["ian", "nad", "jit", "wen", "far", "jus"]);
    expect(matchPlayerIds(matches[0])).toEqual(["ian", "jit", "nad", "wen"]);
  });

  it("keeps what all the chosen players are in, and everything when none is chosen", () => {
    const entries = matches.map((m, index) => ({ id: String(index), playerIds: matchPlayerIds(m) }));
    expect(withAllOf(entries, []).map((e) => e.id)).toEqual(["0", "1", "2"]);
    expect(withAllOf(entries, ["ian", "jit"]).map((e) => e.id)).toEqual(["0", "1"]);
    expect(withAllOf(entries, ["ian", "jit", "wen"]).map((e) => e.id)).toEqual(["0"]);
    expect(withAllOf(entries, ["far", "jus"])).toEqual([]);
  });
});
