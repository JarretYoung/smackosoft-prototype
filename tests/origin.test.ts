import { describe, expect, it } from "vitest";
import { originOf } from "../src/features/auth/origin";

const headers = (values: Record<string, string>) => (name: string) => values[name] ?? null;

describe("originOf", () => {
  it("prefers the Origin header the browser sent", () => {
    expect(originOf(headers({ origin: "http://127.0.0.1:3000", host: "internal:3000" }))).toBe("http://127.0.0.1:3000");
  });

  it("uses the forwarded host and protocol behind a proxy", () => {
    expect(originOf(headers({ "x-forwarded-host": "smacko.app", "x-forwarded-proto": "https", host: "internal" }))).toBe(
      "https://smacko.app",
    );
  });

  it("assumes http for a local host and https otherwise", () => {
    expect(originOf(headers({ host: "localhost:3000" }))).toBe("http://localhost:3000");
    expect(originOf(headers({ host: "smacko.app" }))).toBe("https://smacko.app");
  });

  it("is null without any host", () => {
    expect(originOf(headers({}))).toBeNull();
  });
});
