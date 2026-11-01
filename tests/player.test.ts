import { describe, expect, it } from "vitest";
import { playableOf, thumbnailOf, youtubeIdOf } from "../src/features/videos/player";

const ID = "dQw4w9WgXcQ";

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
      expect(youtubeIdOf(link), link).toBe(ID);
    }
  });

  it("does not take a look-alike for YouTube", () => {
    expect(youtubeIdOf(`https://evilyoutube.com/watch?v=${ID}`)).toBeNull();
    expect(youtubeIdOf("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youtubeIdOf("not a link")).toBeNull();
    expect(youtubeIdOf(`javascript:alert('${ID}')`)).toBeNull();
  });

  it("starts a YouTube embed at the sync point, and never before the start", () => {
    expect(playableOf(`https://youtu.be/${ID}`, 90.7)).toMatchObject({ kind: "youtube" });
    expect(playableOf(`https://youtu.be/${ID}`, 90.7)!.src).toContain("start=90");
    expect(playableOf(`https://youtu.be/${ID}`, -5)!.src).toContain("start=0");
    expect(playableOf(`https://youtu.be/${ID}`, null)!.src).toContain("start=0");
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
