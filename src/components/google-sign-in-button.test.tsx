import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GoogleSignInButton } from "@/src/components/google-sign-in-button";

const signInWithOAuthMock = vi.fn();

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}));

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
  });

  it("starts the Google OAuth flow with a redirect back to the callback route", async () => {
    const user = userEvent.setup();
    signInWithOAuthMock.mockResolvedValueOnce({ error: null });

    render(<GoogleSignInButton next="/friends" />);
    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      expect(signInWithOAuthMock).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=%2Ffriends`,
        },
      });
    });
    expect(
      screen.getByRole("button", { name: /redirecting to google/i }),
    ).toBeDisabled();
  });

  it("shows the error and re-enables the button when the flow cannot start", async () => {
    const user = userEvent.setup();
    signInWithOAuthMock.mockResolvedValueOnce({
      error: new Error("Unsupported provider: provider is not enabled"),
    });

    render(<GoogleSignInButton />);
    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(
      await screen.findByText("Unsupported provider: provider is not enabled"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeEnabled();
  });
});
