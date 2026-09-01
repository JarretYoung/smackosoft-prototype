import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignUpForm } from "@/src/components/sign-up-form";

const pushMock = vi.fn();
const signUpMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/src/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: signUpMock,
    },
  }),
}));

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    email = "test@example.com",
    password = "password123",
    repeat = "password123",
  }: { email?: string; password?: string; repeat?: string } = {},
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^password$/i), password);
  await user.type(screen.getByLabelText(/repeat password/i), repeat);
}

describe("SignUpForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signUpMock.mockReset();
  });

  it("renders email, password, and repeat password fields", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repeat password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^sign up$/i }),
    ).toBeInTheDocument();
  });

  it("shows an error and never calls supabase when passwords don't match", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await fillForm(user, { repeat: "different-password" });
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(
      await screen.findByText("Passwords do not match"),
    ).toBeInTheDocument();
    expect(signUpMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("signs the user up and redirects to the success page", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValueOnce({ error: null });

    render(<SignUpForm />);

    await fillForm(user, { email: "new@example.com", password: "password123" });
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: {
          emailRedirectTo: expect.stringContaining("/protected"),
        },
      });
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/auth/sign-up-success"),
    );
  });

  it("shows an error message and does not redirect when sign up fails", async () => {
    const user = userEvent.setup();
    signUpMock.mockResolvedValueOnce({
      error: new Error("User already registered"),
    });

    render(<SignUpForm />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(
      await screen.findByText("User already registered"),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
