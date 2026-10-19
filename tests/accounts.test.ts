import { describe, expect } from "vitest";
import { id, test } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

describe("accounts", () => {
  test("every use case needs an account, onboarding creates it and replays safely", async ({ world: w }) => {
    const fresh = await w.newUser();
    w.as(fresh);
    expect(code(await w.b.accounts.getCurrent())).toBe("UNAUTHENTICATED");

    const input = { displayName: "Fresh", handle: `fresh_${id().slice(0, 8)}` };
    expect(code(await w.b.accounts.saveCurrent(input))).toBe("ok");
    expect(code(await w.b.accounts.saveCurrent(input))).toBe("ok");
    expect(ok(await w.b.accounts.getCurrent()).account.handle).toBe(input.handle);
  });

  test("a handle changes twice, then the third change is blocked", async ({ world: w }) => {
    const next = () => ({ displayName: "Owner", handle: `h_${id().replace(/-/g, "").slice(0, 10)}` });
    expect(code(await w.b.accounts.saveCurrent(next()))).toBe("ok");
    expect(code(await w.b.accounts.saveCurrent(next()))).toBe("ok");
    expect(failure(await w.b.accounts.saveCurrent(next()))).toEqual({ code: "CONFLICT", paths: [["handle"]] });
    expect(ok(await w.b.accounts.getCurrent()).handleChangesLeft).toBe(0);
  });

  test("a taken handle points at the handle", async ({ world: w }) => {
    w.as(w.mate);
    const result = await w.b.accounts.saveCurrent({ displayName: "Mate", handle: w.owner.handle });
    expect(failure(result)).toEqual({ code: "CONFLICT", paths: [["handle"]] });
  });

  test("only the creator edits a guest", async ({ world: w }) => {
    const guest = { id: id(), displayName: "Aadit", handle: `g_${id().replace(/-/g, "").slice(0, 10)}` };
    expect(code(await w.b.accounts.saveGuests([guest]))).toBe("ok");
    expect(code(await w.b.accounts.saveGuests([guest]))).toBe("ok");

    w.as(w.mate);
    expect(failure(await w.b.accounts.saveGuests([guest]))).toEqual({ code: "CONFLICT", paths: [[0, "id"]] });
  });
});
