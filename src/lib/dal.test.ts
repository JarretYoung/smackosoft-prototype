import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuthedClient,
  getAuthedClientFresh,
  getCurrentUser,
  requireSession,
  requireUser,
  verifySession,
} from "@/src/lib/dal";

const getClaimsMock = vi.fn();
const getUserMock = vi.fn();

/**
 * Next's redirect() throws to unwind the render, so the mock throws too —
 * otherwise the code under test would carry on past a redirect it should
 * never return from.
 */
const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT: ${path}`);
});

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: getClaimsMock, getUser: getUserMock },
  }),
}));

// Referenced lazily: vi.mock factories are hoisted above the consts above.
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

const claims = {
  sub: "user-id-1",
  email: "test@example.com",
  role: "authenticated",
  aal: "aal1",
  session_id: "session-1",
  iss: "http://127.0.0.1:54321/auth/v1",
  aud: "authenticated",
  exp: 4102444800,
  iat: 1700000000,
};

const user = { id: "user-id-1", email: "test@example.com" };

describe("verifySession", () => {
  beforeEach(() => {
    getClaimsMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the user id, email and raw claims for a valid token", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: { claims }, error: null });

    await expect(verifySession()).resolves.toEqual({
      userId: "user-id-1",
      email: "test@example.com",
      claims,
    });
  });

  it("returns null when the token fails verification", async () => {
    getClaimsMock.mockResolvedValueOnce({
      data: null,
      error: new Error("invalid claim: missing sub claim"),
    });

    await expect(verifySession()).resolves.toBeNull();
  });

  it("returns null when there is no session", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(verifySession()).resolves.toBeNull();
  });

  it("returns null when the claims carry no subject", async () => {
    getClaimsMock.mockResolvedValueOnce({
      data: { claims: { ...claims, sub: undefined } },
      error: null,
    });

    await expect(verifySession()).resolves.toBeNull();
  });
});

describe("requireSession", () => {
  beforeEach(() => {
    getClaimsMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the session without redirecting when signed in", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: { claims }, error: null });

    await expect(requireSession()).resolves.toMatchObject({
      userId: "user-id-1",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to the login page when signed out", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});

describe("getCurrentUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the user from the auth server", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user }, error: null });

    await expect(getCurrentUser()).resolves.toEqual(user);
  });

  it("returns null when the auth server rejects the session", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Auth session missing!"),
    });

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null when there is no user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("requireUser", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("returns the user without redirecting when signed in", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user }, error: null });

    await expect(requireUser()).resolves.toEqual(user);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to the login page when signed out", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});

describe("getAuthedClient", () => {
  beforeEach(() => {
    getClaimsMock.mockReset();
    redirectMock.mockClear();
  });

  it("hands back a client alongside the verified session", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: { claims }, error: null });

    const { supabase, session } = await getAuthedClient();

    expect(session.userId).toBe("user-id-1");
    expect(supabase.auth).toBeDefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects instead of handing out a client when signed out", async () => {
    getClaimsMock.mockResolvedValueOnce({ data: null, error: null });

    await expect(getAuthedClient()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});

describe("getAuthedClientFresh", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    redirectMock.mockClear();
  });

  it("hands back a client alongside the freshly read user", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user }, error: null });

    const { supabase, user: got } = await getAuthedClientFresh();

    expect(got).toEqual(user);
    expect(supabase.auth).toBeDefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects when the auth server rejects the session", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Auth session missing!"),
    });

    await expect(getAuthedClientFresh()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/login");
  });
});
