import { describe, expect, it } from "vitest";
import type { SessionVideo } from "../src/contract";
import { formatOffset, OFFSET_LIMIT, parseOffset, roundOffset } from "../src/features/videos/offset";
import { attentionOf } from "../src/features/videos/videos";

describe("sync point text", () => {
  it("formats whole seconds plainly, with a minus before the start", () => {
    expect([0, 10, 62, -5].map(formatOffset)).toEqual(["0:00", "0:10", "1:02", "-0:05"]);
  });

  it("shows hundredths only when there are some", () => {
    expect([10.033, 10.067, 10.5, -0.2, 61.25].map(formatOffset)).toEqual(["0:10.03", "0:10.07", "0:10.50", "-0:00.20", "1:01.25"]);
  });

  it("parses what people type, and rejects the rest", () => {
    expect(["90", "1:30", "-0:05", "+5", " 2:00 ", "1.5", "0:10.03", "10.033"].map(parseOffset)).toEqual([90, 90, -5, 5, 120, 1.5, 10.03, 10.033]);
    for (const bad of ["", "abc", "1:75", "1:60", "1.2345", "1,5", `${OFFSET_LIMIT + 1}`]) expect(parseOffset(bad)).toBeNull();
  });

  it("round trips through the text", () => {
    for (const n of [-1800, -61, -1, 0, 1, 59, 60, 1800, 10.03, -3.25]) expect(parseOffset(formatOffset(n))).toBe(n);
  });

  it("keeps a sync point to the millisecond", () => {
    expect(roundOffset(10 + 1 / 30)).toBe(10.033);
    expect(roundOffset(12.3456789)).toBe(12.346);
  });
});

const link = (videoId: string, matchGameId: string | null, canonicalOffset: number | null) =>
  ({ videoId, matchGameId, canonicalOffset }) as SessionVideo;

describe("what needs attention", () => {
  const linked = [
    link("a", null, null), // in the pool and in game 2, so assigned
    link("b", null, null), // pool only
    link("a", "g2", null), // not synced
    link("c", "g1", null), // not synced, earlier game
    link("d", "g1", 4), // synced
  ];

  it("counts unsynced game links in game order and unassigned pool footage", () => {
    const { unsynced, unassigned } = attentionOf(linked, ["g1", "g2"], null);
    expect(unsynced.map((l) => l.videoId)).toEqual(["c", "a"]);
    expect(unassigned.map((l) => l.videoId)).toEqual(["b"]);
  });

  it("looks at one game only when focused", () => {
    const { unsynced, unassigned } = attentionOf(linked, ["g1", "g2"], "g2");
    expect(unsynced.map((l) => l.videoId)).toEqual(["a"]);
    expect(unassigned).toEqual([]);
  });
});
