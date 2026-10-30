import { describe, expect, it } from "vitest";
import { SessionSave } from "../src/contract";
import { validate, visibleErrors } from "../src/features/sessions/validate";

const session = { id: crypto.randomUUID(), label: "Friday", date: "2026-11-06" };

describe("form validation", () => {
  it("replaces the contract's wording with copy that says what to do", () => {
    const issues = validate(SessionSave, { ...session, label: "  " }, { label: "Give the session a title" });
    expect(issues).toEqual({ label: "Give the session a title" });
  });

  it("flags an end time that is not after the start, on the end field", () => {
    const issues = validate(SessionSave, {
      ...session,
      startTime: "2026-11-06T12:00:00.000Z",
      endTime: "2026-11-06T11:00:00.000Z",
    });
    expect(Object.keys(issues)).toEqual(["endTime"]);
  });

  it("lets a field speak once it is left, and everyone after a failed submit", () => {
    const issues = { label: "a", date: "b" };
    expect(visibleErrors(issues, {}, false)).toEqual({});
    expect(visibleErrors(issues, { label: true }, false)).toEqual({ label: "a" });
    expect(visibleErrors(issues, {}, true)).toEqual(issues);
  });
});
