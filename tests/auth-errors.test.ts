import { describe, expect, it } from "vitest";
import { passwordProblem } from "../src/lib/auth-errors";

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
