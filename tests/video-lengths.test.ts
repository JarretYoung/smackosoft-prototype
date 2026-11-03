import { describe, expect, it, vi } from "vitest";
import { lengthsOf, type LengthSource } from "../src/server/video-lengths";
import { secondsOfIsoDuration, youtubeLengths } from "../src/server/video-lengths/youtube";

describe("YouTube durations", () => {
  it("counts days, hours, minutes and seconds", () => {
    expect(secondsOfIsoDuration("PT45S")).toBe(45);
    expect(secondsOfIsoDuration("PT1H2M10S")).toBe(3730);
    expect(secondsOfIsoDuration("PT2H")).toBe(7200);
    expect(secondsOfIsoDuration("P1DT2H")).toBe(93600);
  });

  it("gives nothing for a live stream, which reports zero, or for text that is not a duration", () => {
    expect(secondsOfIsoDuration("P0D")).toBeNull();
    expect(secondsOfIsoDuration("1:02:10")).toBeNull();
    expect(secondsOfIsoDuration("")).toBeNull();
  });
});

const answer = (items: object[], status = 200) => new Response(JSON.stringify({ items }), { status });

describe("reading lengths from the YouTube Data API", () => {
  it("asks for up to 50 videos a call, with the key in a header, and maps each id to its seconds", async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `id${String(i).padStart(9, "0")}`);
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => {
      const asked = new URL(String(url)).searchParams.get("id")!.split(",");
      return answer(asked.map((id) => ({ id, contentDetails: { duration: "PT1M" } })));
    });
    const lengths = await youtubeLengths({ key: "secret", fetch }).lengthsOf(ids);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("id")!.split(",").length)).toEqual([50, 50, 20]);
    expect(String(fetch.mock.calls[0][0])).not.toContain("secret");
    expect((fetch.mock.calls[0][1]?.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret");
    expect(lengths.size).toBe(120);
    expect(lengths.get(ids[0])).toBe(60);
  });

  it("leaves out a video the service does not return, and one with no length yet", async () => {
    const fetch = vi.fn(async () => answer([{ id: "aaaaaaaaaaa", contentDetails: { duration: "PT9S" } }, { id: "ccccccccccc", contentDetails: { duration: "P0D" } }]));
    const lengths = await youtubeLengths({ key: "k", fetch }).lengthsOf(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]);
    expect([...lengths]).toEqual([["aaaaaaaaaaa", 9]]);
  });

  it("reads nothing, without failing, when there is no key, the service refuses, or the network is down", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const unused = vi.fn();
    expect((await youtubeLengths({ key: undefined, fetch: unused }).lengthsOf(["aaaaaaaaaaa"])).size).toBe(0);
    expect(unused).not.toHaveBeenCalled();

    expect((await youtubeLengths({ key: "k", fetch: async () => answer([], 403) }).lengthsOf(["aaaaaaaaaaa"])).size).toBe(0);
    expect((await youtubeLengths({ key: "k", fetch: async () => Promise.reject(new Error("offline")) }).lengthsOf(["aaaaaaaaaaa"])).size).toBe(0);
    warn.mockRestore();
  });
});

describe("lengths for links, whatever the source", () => {
  const fake = (seconds: Record<string, number>): LengthSource & { asked: string[][] } => {
    const asked: string[][] = [];
    return {
      id: "youtube",
      asked,
      async lengthsOf(ids) {
        asked.push(ids);
        return new Map(ids.filter((id) => id in seconds).map((id) => [id, seconds[id]]));
      },
    };
  };

  it("asks the source once for the ids, and answers every link that points at the same video", async () => {
    const source = fake({ dQw4w9WgXcQ: 212 });
    const links = ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5", "https://cdn.example.com/a.mp4"];
    const found = await lengthsOf(links, [source]);
    expect(source.asked).toEqual([["dQw4w9WgXcQ"]]);
    expect([...found]).toEqual([[links[0], 212], [links[1], 212]]);
  });

  it("does not call a source when no link is its own", async () => {
    const source = fake({});
    expect((await lengthsOf(["https://cdn.example.com/a.mp4"], [source])).size).toBe(0);
    expect(source.asked).toEqual([]);
  });
});
