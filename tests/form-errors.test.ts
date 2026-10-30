import { describe, expect, it } from "vitest";
import { fail } from "../src/contract";
import { emailProblem } from "../src/features/auth/auth-errors";
import { firstMessage, fromProblem, splitServerErrors } from "../src/lib/form-errors";

const failure = (...issues: { path: string[]; message: string }[]) => {
  const result = fail("VALIDATION", issues);
  if (result.ok) throw new Error("expected a failure");
  return result.error;
};

describe("form error mapping", () => {
  it("reads the first message from strings and issues", () => {
    expect(firstMessage([])).toBeUndefined();
    expect(firstMessage([undefined, "", { message: "Enter your name" }, "later"])).toBe("Enter your name");
  });

  it("puts server messages on the fields the form has", () => {
    const error = failure({ path: ["handle"], message: "That handle is taken" }, { path: ["other"], message: "x" });
    expect(splitServerErrors(error, ["displayName", "handle"])).toEqual({
      matched: { handle: "That handle is taken" },
      unmatched: false,
    });
  });

  it("flags an error that points at no field of the form", () => {
    const error = failure({ path: ["email"], message: "Bad email" });
    expect(splitServerErrors(error, ["password"])).toEqual({ matched: {}, unmatched: true });
    expect(splitServerErrors({ code: "FORBIDDEN" }, ["password"]).unmatched).toBe(true);
  });

  it("turns a problem function into a schema with the same message", () => {
    const schema = fromProblem(emailProblem);
    expect(schema.safeParse("a@b.co").success).toBe(true);
    const bad = schema.safeParse("nope");
    expect(bad.success ? null : bad.error.issues[0].message).toBe(emailProblem("nope"));
  });
});
