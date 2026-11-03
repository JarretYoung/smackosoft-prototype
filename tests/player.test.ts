import { describe, expect, it } from "vitest";
import { playableOf } from "../src/features/videos/player";
import { refOf, sourceKeyOf, thumbnailOf } from "../src/lib/video-sources";

const ID = "dQw4w9WgXcQ";
const idOf = (link: string) => refOf(link)?.id ?? null;

describe("which links play in the page", () => {
  it("reads the id from every YouTube link shape", () => {
    for (const link of [
      `https://www.youtube.com/watch?v=${ID}&t=30s`,
      `https://youtu.be/${ID}?si=abc`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
    ]) {
      expect(idOf(link), link).toBe(ID);
    }
  });

  it("does not take a look-alike for YouTube", () => {
    expect(idOf(`https://evilyoutube.com/watch?v=${ID}`)).toBeNull();
    expect(idOf("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(idOf("not a link")).toBeNull();
    expect(idOf(`javascript:alert('${ID}')`)).toBeNull();
  });

  it("names the same video the same way whatever the link looks like", () => {
    expect(sourceKeyOf(`https://youtu.be/${ID}?si=abc`)).toBe(`youtube:${ID}`);
    expect(sourceKeyOf(`https://www.youtube.com/watch?v=${ID}&list=PL1&t=30s`)).toBe(`youtube:${ID}`);
    expect(sourceKeyOf("https://drive.google.com/file/d/abc/view")).toBeNull();
  });

  it("starts a YouTube video at the sync point, and never before the start", () => {
    const link = `https://youtu.be/${ID}`;
    expect(playableOf(link, 90.7)).toEqual({ link, source: "youtube", start: 90 });
    expect(playableOf(link, -5)).toEqual({ link, source: "youtube", start: 0 });
    expect(playableOf(link, null)).toEqual({ link, source: "youtube", start: 0 });
  });

  it("leaves other links to open in a new tab", () => {
    expect(playableOf("https://drive.google.com/file/d/abc/view", 5)).toBeNull();
    expect(playableOf("https://cdn.example.com/game1.mp4", null)).toBeNull();
  });

  it("gives a thumbnail for YouTube only", () => {
    expect(thumbnailOf(`https://youtu.be/${ID}`)).toBe(`https://i.ytimg.com/vi/${ID}/mqdefault.jpg`);
    expect(thumbnailOf("https://cdn.example.com/game1.mp4")).toBeNull();
  });
});
