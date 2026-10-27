import { describe, expect, it } from "vitest";
import type { SessionVideo } from "../src/contract";
import { formatOffset, OFFSET_LIMIT, parseOffset } from "../src/lib/offset";
import { attentionOf } from "../src/lib/videos";

describe("sync point text", () => {
  it("formats whole seconds, with a minus before the start", () => {
    expect([0, 10, 62, -5, -0.2].map(formatOffset)).toEqual(["0:00", "0:10", "1:02", "-0:05", "0:00"]);
  });

  it("parses what people type, and rejects the rest", () => {
    expect(["90", "1:30", "-0:05", "+5", " 2:00 "].map(parseOffset)).toEqual([90, 90, -5, 5, 120]);
    for (const bad of ["", "abc", "1:75", "1.5", `${OFFSET_LIMIT + 1}`]) expect(parseOffset(bad)).toBeNull();
  });

  it("round trips through the text", () => {
    for (const n of [-1800, -61, -1, 0, 1, 59, 60, 1800]) expect(parseOffset(formatOffset(n))).toBe(n);
  });
});

const link = (videoId: string, matchGameId: string | null, offsetSeconds: number | null) =>
  ({ videoId, matchGameId, offsetSeconds }) as SessionVideo;

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
