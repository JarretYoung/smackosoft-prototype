import { describe, expect, it } from "vitest";
import { isSyncValid, startSync, syncReducer } from "../src/features/videos/sync-offset";
import { OFFSET_LIMIT } from "../src/features/videos/offset";

describe("sync sheet state", () => {
  it("starts at zero for a video that is not synced", () => {
    expect(startSync(null)).toEqual({ value: 0, draft: "0:00" });
    expect(startSync(65)).toEqual({ value: 65, draft: "1:05" });
  });

  it("keeps the last good number while the text is mid-edit, and tidies it on blur", () => {
    let state = startSync(10);
    state = syncReducer(state, { type: "type", text: "1:" });
    expect(state).toEqual({ value: 10, draft: "1:" });
    expect(isSyncValid(state)).toBe(false);
    state = syncReducer(state, { type: "blur" });
    expect(state).toEqual({ value: 10, draft: "0:10" });
    expect(isSyncValid(state)).toBe(true);
  });

  it("takes a time from the player to the millisecond, and shows it with hundredths", () => {
    const state = syncReducer(startSync(10), { type: "set", seconds: 12.3456789 });
    expect(state).toEqual({ value: 12.346, draft: "0:12.35" });
    expect(isSyncValid(state)).toBe(true);
  });

  it("clamps the ruler and steps to the limit and rewrites the text", () => {
    const state = syncReducer(startSync(0), { type: "set", seconds: OFFSET_LIMIT + 50 });
    expect(state.value).toBe(OFFSET_LIMIT);
    expect(state.draft).toBe("30:00");
  });
});
