import { describe, expect } from "vitest";
import { id, test } from "./support/fixtures";
import { code, failure, ok, whileLocked } from "./support/helpers";

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

  test("two parallel handle changes cannot spend more than the allowance", async ({ world: w }) => {
    const next = () => ({ displayName: "Owner", handle: `h_${id().replace(/-/g, "").slice(0, 10)}` });
    expect(code(await w.b.accounts.saveCurrent(next()))).toBe("ok"); // one change left

    const results = await whileLocked(
      w.admin,
      "select 1 from smackosoft.accounts where id = $1 for update",
      [w.owner.accountId],
      () => Promise.all([w.b.accounts.saveCurrent(next()), w.b.accounts.saveCurrent(next())]),
    );
    expect(results.map(code).sort()).toEqual(["CONFLICT", "ok"]);
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

describe("guests", () => {
  const handle = () => `g_${id().replace(/-/g, "").slice(0, 10)}`;

  test("removing a guest hides it, frees the handle and only works for the creator", async ({ world: w }) => {
    const guest = { id: id(), displayName: "Aadit", handle: handle() };
    ok(await w.b.accounts.saveGuests([guest]));
    expect(ok(await w.b.accounts.listGuests()).map((g) => g.id)).toContain(guest.id);

    w.as(w.mate);
    expect(code(await w.b.accounts.removeGuests([guest.id]))).toBe("ok"); // not theirs, so skipped
    w.as(w.owner);
    expect(ok(await w.b.accounts.listGuests()).map((g) => g.id)).toContain(guest.id);

    expect(code(await w.b.accounts.removeGuests([guest.id]))).toBe("ok");
    expect(code(await w.b.accounts.removeGuests([guest.id]))).toBe("ok"); // replay
    expect(ok(await w.b.accounts.listGuests()).map((g) => g.id)).not.toContain(guest.id);
    expect(code(await w.b.accounts.saveGuests([{ id: id(), displayName: "New Aadit", handle: guest.handle }]))).toBe("ok");
  });

  test("two parallel renames of a guest cannot spend more than the allowance", async ({ world: w }) => {
    const guest = { id: id(), displayName: "Raj", handle: handle() };
    ok(await w.b.accounts.saveGuests([guest]));
    ok(await w.b.accounts.saveGuests([{ ...guest, handle: handle() }])); // one change left

    const results = await whileLocked(
      w.admin,
      "select 1 from smackosoft.accounts where id = $1 for update",
      [guest.id],
      () =>
        Promise.all([
          w.b.accounts.saveGuests([{ ...guest, handle: handle() }]),
          w.b.accounts.saveGuests([{ ...guest, handle: handle() }]),
        ]),
    );
    expect(results.map(code).sort()).toEqual(["CONFLICT", "ok"]);
  });

  test("a guest is claimed with a code and keeps its history", async ({ world: w }) => {
    const guest = { id: id(), displayName: "Dina", handle: handle() };
    ok(await w.b.accounts.saveGuests([guest]));
    const { token } = ok(await w.b.accounts.createClaim({ guestId: guest.id }));
    expect(ok(await w.b.accounts.listGuests()).find((g) => g.id === guest.id)?.hasClaimCode).toBe(true);

    // Someone else cannot make a code for it.
    w.as(w.mate);
    expect(failure(await w.b.accounts.createClaim({ guestId: guest.id }))).toEqual({ code: "NOT_FOUND", paths: [["guestId"]] });

    // A person with an account cannot claim. A wrong code finds nothing.
    expect(failure(await w.b.accounts.claim({ token }))).toEqual({ code: "CONFLICT", paths: [["token"]] });
    const fresh = await w.newUser();
    w.as(fresh);
    expect(failure(await w.b.accounts.claim({ token: "not-a-real-code" }))).toEqual({ code: "NOT_FOUND", paths: [["token"]] });

    expect(code(await w.b.accounts.claim({ token }))).toBe("ok");
    const mine = ok(await w.b.accounts.getCurrent());
    expect(mine.account).toMatchObject({ id: guest.id, displayName: "Dina", isGuest: false });
    expect(failure(await w.b.accounts.claim({ token }))).toEqual({ code: "CONFLICT", paths: [["token"]] });

    w.as(w.owner);
    expect(ok(await w.b.accounts.listGuests()).map((g) => g.id)).not.toContain(guest.id);
  });
});
