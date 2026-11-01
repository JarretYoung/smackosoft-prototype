import { describe, expect, it } from "vitest";
import { needsRefresh, STALE_AFTER_MS } from "../src/lib/stale";

describe("needsRefresh", () => {
  const base = { renderedAt: 1_000_000, lastRefreshAt: null };

  it("leaves a fresh page alone", () => {
    expect(needsRefresh({ ...base, now: base.renderedAt + STALE_AFTER_MS })).toBe(false);
  });

  it("refreshes a page older than the window", () => {
    expect(needsRefresh({ ...base, now: base.renderedAt + STALE_AFTER_MS + 1 })).toBe(true);
  });

  it("asks once per window even when the page still looks old", () => {
    // A client clock far ahead of the server's keeps the page looking stale after every refresh.
    const now = base.renderedAt + 60_000;
    expect(needsRefresh({ ...base, now, lastRefreshAt: now - 1_000 })).toBe(false);
    expect(needsRefresh({ ...base, now, lastRefreshAt: now - STALE_AFTER_MS - 1 })).toBe(true);
  });
});
