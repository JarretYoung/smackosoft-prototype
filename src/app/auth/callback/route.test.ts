import { type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/src/app/auth/callback/route";

const exchangeCodeForSessionMock = vi.fn();

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock,
    },
  }),
}));

// The real redirect() throws to abort rendering; mirror that so the route
// stops at the first redirect exactly as it does in Next.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

function callback(query: string) {
  const request = new Request(`http://localhost:3000/auth/callback${query}`);
  return GET(request as NextRequest);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    exchangeCodeForSessionMock.mockReset();
  });

  it("exchanges the code and redirects to next", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({ error: null });

    await expect(callback("?code=abc&next=%2Ffriends")).rejects.toThrow(
      "NEXT_REDIRECT:/friends",
    );
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("abc");
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com"])(
    "ignores an off-site next of %s",
    async (next) => {
      exchangeCodeForSessionMock.mockResolvedValueOnce({ error: null });

      await expect(
        callback(`?code=abc&next=${encodeURIComponent(next)}`),
      ).rejects.toThrow(/^NEXT_REDIRECT:\/$/);
    },
  );

  it("redirects to the error page when the exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValueOnce({
      error: new Error("invalid flow state"),
    });

    await expect(callback("?code=abc")).rejects.toThrow(
      "NEXT_REDIRECT:/auth/error?error=invalid%20flow%20state",
    );
  });

  it("surfaces the provider's error when no code is returned", async () => {
    await expect(
      callback("?error=access_denied&error_description=User+cancelled"),
    ).rejects.toThrow("NEXT_REDIRECT:/auth/error?error=User%20cancelled");
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });
});
