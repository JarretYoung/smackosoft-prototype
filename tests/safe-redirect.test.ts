import { describe, expect, it } from "vitest";
import { safeNext } from "../src/lib/safe-redirect";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/auth/update-password")).toBe("/auth/update-password");
    expect(safeNext("/sessions?tab=past")).toBe("/sessions?tab=past");
  });

  it("falls back for anything that could leave the site", () => {
    for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null, undefined]) {
      expect(safeNext(next)).toBe("/");
    }
  });
});
