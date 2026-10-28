import { describe, expect, it } from "vitest";
import { parseMapsLink } from "../src/lib/maps-link";
import { resolveMapsShortLink } from "../src/lib/maps-resolve";

const NONE = { latitude: null, longitude: null };

describe("parseMapsLink", () => {
  it("reads the place name and the centre from a full Google Maps link", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Sunway+Serene/@3.07,101.6,17z")).toEqual({
      name: "Sunway Serene",
      isMaps: true,
      latitude: 3.07,
      longitude: 101.6,
    });
  });

  it("prefers the place itself over where the map was centered", () => {
    const link =
      "https://www.google.com/maps/place/Sunway+Serene/@3.090608,101.6037662,17z/data=!3m1!4b1!4m6!3m5!8m2!3d3.0906026!4d101.6063411!16s%2Fg%2F11m1k8bpy9?entry=tts";
    expect(parseMapsLink(link)).toMatchObject({ latitude: 3.0906026, longitude: 101.6063411 });
  });

  it("decodes percent escapes in the name", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Caf%C3%A9+Court/@3,101,17z")?.name).toBe("Café Court");
  });

  it("keeps a short link as a maps link with no name and no point", () => {
    expect(parseMapsLink("https://maps.app.goo.gl/example")).toEqual({ name: null, isMaps: true, ...NONE });
  });

  it("takes a point from a q of two numbers, and does not take it for a name", () => {
    expect(parseMapsLink("https://www.google.com/maps?q=3.07,101.6")).toEqual({
      name: null,
      isMaps: true,
      latitude: 3.07,
      longitude: 101.6,
    });
  });

  it("ignores a point that is off the map", () => {
    expect(parseMapsLink("https://www.google.com/maps/place/Nowhere/@95,200,17z")).toMatchObject(NONE);
  });

  it("says a non maps link is not a maps link, and text is not a link", () => {
    expect(parseMapsLink("https://example.com/venue")).toEqual({ name: null, isMaps: false, ...NONE });
    expect(parseMapsLink("Sunway Serene")).toBeNull();
  });
});

const redirect = (to: string) => new Response(null, { status: 302, headers: { location: to } });

describe("resolveMapsShortLink", () => {
  it("follows a short link to the place", async () => {
    const doFetch = async () => redirect("https://www.google.com/maps/place/Sunway+Serene/@3.09,101.6,17z/data=!3d3.0906026!4d101.6063411");
    expect(await resolveMapsShortLink("https://maps.app.goo.gl/abc", doFetch as typeof fetch)).toMatchObject({
      name: "Sunway Serene",
      latitude: 3.0906026,
      longitude: 101.6063411,
    });
  });

  it("never requests anything but a short link host", async () => {
    const requested: string[] = [];
    const doFetch = async (url: string | URL | Request) => {
      requested.push(String(url));
      return redirect("https://evil.example/maps/place/Nope");
    };
    expect(await resolveMapsShortLink("https://maps.app.goo.gl/abc", doFetch as typeof fetch)).toBeNull();
    expect(requested).toEqual(["https://maps.app.goo.gl/abc"]);
  });

  it("refuses a link that is not a short link without any request", async () => {
    const doFetch = async () => {
      throw new Error("should not fetch");
    };
    expect(await resolveMapsShortLink("https://example.com/x", doFetch as typeof fetch)).toBeNull();
  });
});
