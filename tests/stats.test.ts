import { describe, expect } from "vitest";
import { scoredMatch } from "./support/builders";
import { test } from "./support/fixtures";
import { ok } from "./support/helpers";

describe("stats (provisional)", () => {
  test("the winning side counts a won match, games and teammates", async ({ world: w }) => {
    await scoredMatch(w); // owner and mate beat stranger 21-17, 21-19
    expect(ok(await w.b.stats.get())).toEqual({ matches: 1, wins: 1, losses: 0, winRate: 1, streak: 1 });

    const teammates = ok(await w.b.stats.getTeammates());
    expect(teammates).toHaveLength(1);
    expect(teammates[0]).toMatchObject({ games: 2, wins: 2, losses: 0, winRate: 1 });
    expect(teammates[0].account.id).toBe(w.mate.accountId);
  });

  test("the losing side counts a lost match and an empty history is null", async ({ world: w }) => {
    await scoredMatch(w);
    w.as(w.stranger);
    expect(ok(await w.b.stats.get())).toEqual({ matches: 1, wins: 0, losses: 1, winRate: 0, streak: 0 });

    const nobody = await w.person("nobody");
    w.as(nobody);
    expect(ok(await w.b.stats.get())).toEqual({ matches: 0, wins: 0, losses: 0, winRate: null, streak: 0 });
  });
});
