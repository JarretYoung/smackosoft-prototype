import { describe, expect } from "vitest";
import type { GrantableRole } from "../src/contract";
import { newSession } from "./support/builders";
import { id, test, type Person } from "./support/fixtures";
import { code, failure, ok } from "./support/helpers";

/**
 * Who may do what, one fresh session per row. The owner creates the session and the
 * acting account holds the given role. "none" is an account with no access.
 */
type Acting = "none" | GrantableRole | "OWNER";
type Action = "read" | "editMatch" | "manageMembers" | "deleteSession";

const cases: [Acting, Record<Action, string>][] = [
  ["none", { read: "NOT_FOUND", editMatch: "NOT_FOUND", manageMembers: "NOT_FOUND", deleteSession: "ok" }], // removing what you cannot see is a no-op
  ["VIEWER", { read: "ok", editMatch: "FORBIDDEN", manageMembers: "FORBIDDEN", deleteSession: "FORBIDDEN" }],
  ["EDITOR", { read: "ok", editMatch: "ok", manageMembers: "FORBIDDEN", deleteSession: "FORBIDDEN" }],
  ["MANAGER", { read: "ok", editMatch: "ok", manageMembers: "ok", deleteSession: "FORBIDDEN" }],
  ["OWNER", { read: "ok", editMatch: "ok", manageMembers: "ok", deleteSession: "ok" }],
];

describe("authorization by role", () => {
  test.for(cases)("%s", async ([acting, expected], { world: w }) => {
    const sessionId = await newSession(w);
    let actor: Person = w.owner;
    if (acting !== "none" && acting !== "OWNER") {
      ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: acting }]));
      actor = w.mate;
    } else if (acting === "none") {
      actor = w.stranger;
    }
    w.as(actor);

    const got: Record<Action, string> = {
      read: code(await w.b.sessions.get({ sessionId })),
      editMatch: code(await w.b.matches.save([{ id: id(), sessionId, label: "M", matchType: "MS" }])),
      manageMembers: code(await w.b.members.save([{ sessionId, accountId: w.stranger.accountId, role: "VIEWER" }])),
      deleteSession: code(await w.b.sessions.remove([sessionId])),
    };
    expect(got).toEqual(expected);
  });
});

describe("membership rules", () => {
  test("the owner's row cannot be changed or removed", async ({ world: w }) => {
    const sessionId = await newSession(w);
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "MANAGER" }]));
    w.as(w.mate);
    expect(failure(await w.b.members.save([{ sessionId, accountId: w.owner.accountId, role: "VIEWER" }]))).toEqual({
      code: "CONFLICT",
      paths: [[0, "accountId"]],
    });
    expect(failure(await w.b.members.remove([{ sessionId, accountId: w.owner.accountId }]))).toEqual({
      code: "CONFLICT",
      paths: [[0, "accountId"]],
    });
  });

  test("only the owner grants the manager role", async ({ world: w }) => {
    const sessionId = await newSession(w);
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "MANAGER" }]));
    w.as(w.mate);
    const result = await w.b.members.save([{ sessionId, accountId: w.stranger.accountId, role: "MANAGER" }]);
    expect(failure(result)).toEqual({ code: "FORBIDDEN", paths: [[0, "role"]] });
  });

  test("a member who still plays cannot be removed until the player is", async ({ world: w }) => {
    const sessionId = await newSession(w);
    const [matchId, team] = [id(), id()];
    ok(await w.b.matches.save([{ id: matchId, sessionId, label: "M", matchType: "MS" }]));
    ok(await w.b.matches.saveTeams([{ id: team, matchId, label: "T" }]));
    ok(await w.b.matches.saveMatchPlayers([{ matchTeamId: team, accountId: w.mate.accountId }]));

    const remove = [{ sessionId, accountId: w.mate.accountId }];
    expect(failure(await w.b.members.remove(remove))).toEqual({ code: "CONFLICT", paths: [[0, "accountId"]] });
    ok(await w.b.matches.removeMatchPlayers([{ matchTeamId: team, accountId: w.mate.accountId }]));
    expect(code(await w.b.members.remove(remove))).toBe("ok");
  });

  test("saving a player makes them a viewer member", async ({ world: w }) => {
    const sessionId = await newSession(w);
    const [matchId, team] = [id(), id()];
    ok(await w.b.matches.save([{ id: matchId, sessionId, label: "M", matchType: "MS" }]));
    ok(await w.b.matches.saveTeams([{ id: team, matchId, label: "T" }]));
    ok(await w.b.matches.saveMatchPlayers([{ matchTeamId: team, accountId: w.mate.accountId }]));

    w.as(w.mate);
    expect(ok(await w.b.sessions.get({ sessionId })).myRole).toBe("VIEWER");
  });

  test("adding a new player takes the manager role", async ({ world: w }) => {
    const sessionId = await newSession(w);
    const [matchId, team] = [id(), id()];
    ok(await w.b.matches.save([{ id: matchId, sessionId, label: "M", matchType: "MS" }]));
    ok(await w.b.matches.saveTeams([{ id: team, matchId, label: "T" }]));
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "EDITOR" }]));

    w.as(w.mate);
    const add = (accountId: string) => w.b.matches.saveMatchPlayers([{ matchTeamId: team, accountId }]);
    expect(failure(await add(w.stranger.accountId))).toEqual({ code: "FORBIDDEN", paths: [[0, "accountId"]] });
    expect(code(await add(w.owner.accountId))).toBe("ok"); // already a member
  });

  test("database errors do not leak row values", async ({ world: w }) => {
    const sessionId = await newSession(w);
    const result = await w.b.members.save([{ sessionId, accountId: id(), role: "VIEWER" }]); // no such account
    if (result.ok) throw new Error("Expected a failure");
    expect(result.error).toEqual({ code: "CONFLICT", issues: [{ path: [], message: "Conflicts with existing data" }] });
  });
});

describe("leaving a session", () => {
  test("a member can remove themselves, the owner cannot", async ({ world: w }) => {
    const sessionId = await newSession(w);
    ok(await w.b.members.save([{ sessionId, accountId: w.mate.accountId, role: "VIEWER" }]));

    w.as(w.mate);
    expect(code(await w.b.members.remove([{ sessionId, accountId: w.mate.accountId }]))).toBe("ok");
    expect(code(await w.b.sessions.get({ sessionId }))).toBe("NOT_FOUND");

    w.as(w.owner);
    const leave = await w.b.members.remove([{ sessionId, accountId: w.owner.accountId }]);
    expect(failure(leave)).toEqual({ code: "CONFLICT", paths: [[0, "accountId"]] });
  });
});
