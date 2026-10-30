import { describe, expect, it } from "vitest";
import { authFailure, inputFailure, passwordProblem } from "../src/features/auth/auth-errors";
import { errorMessage, fieldErrors } from "../src/lib/errors";

describe("passwordProblem", () => {
  it("accepts 8 characters with lower, upper and a number", () => {
    expect(passwordProblem("Password123")).toBeUndefined();
    expect(passwordProblem("Abcdefg1")).toBeUndefined();
  });

  it("rejects short passwords and missing character kinds", () => {
    for (const password of ["Abcde1", "password123", "PASSWORD123", "PasswordOnly", ""]) {
      expect(passwordProblem(password)).toBeTruthy();
    }
  });
});

describe("authFailure", () => {
  it("puts email problems under email and the rest under the fallback field", () => {
    expect(fieldErrors(authFailure({ code: "email_exists" }, "password").error)).toHaveProperty("email");
    expect(fieldErrors(authFailure({ code: "invalid_credentials" }, "password").error)).toHaveProperty("password");
  });

  it("never shows the provider text", () => {
    const result = authFailure({ code: "weird", message: "raw provider text" }, "password");
    expect(errorMessage(result.error)).toBe("Something went wrong. Please try again.");
  });

  it("explains an unreachable Supabase", () => {
    const error = Object.assign(new Error("fetch failed"), { name: "AuthRetryableFetchError" });
    expect(errorMessage(authFailure(error, "email").error)).toMatch(/Could not reach the server/);
  });
});

describe("inputFailure", () => {
  it("is null when every field is fine", () => {
    expect(inputFailure({ email: undefined, password: undefined })).toBeNull();
  });

  it("lists each problem under its field", () => {
    const result = inputFailure({ email: "bad", password: undefined });
    expect(result && fieldErrors(result.error)).toEqual({ email: "bad" });
  });
});
