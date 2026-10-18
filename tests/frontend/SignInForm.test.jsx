import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const signIn = vi.fn();

// SignInForm reaches into next/navigation's app-router hooks and
// next-auth/react's signIn — neither has anything to attach to outside a
// real Next.js request/render context, so both are mocked here rather than
// dragging in a full app-router test harness for one form.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const SignInForm = (await import("@/components/auth/SignInForm")).default;

beforeEach(() => {
  push.mockClear();
  signIn.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("SignInForm", () => {
  it("shows a Forgot password? link pointing at /forgot-password", () => {
    render(<SignInForm hasGoogle={false} hasGithub={false} />);
    const link = screen.getByRole("link", { name: "Forgot password?" });
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("disables the submit button while a sign-in is in flight", async () => {
    let resolveSignIn;
    signIn.mockReturnValue(new Promise((resolve) => (resolveSignIn = resolve)));
    const userEv = userEvent.setup();

    render(<SignInForm hasGoogle={false} hasGithub={false} />);
    await userEv.type(screen.getByLabelText(/email/i), "alice@example.com");
    await userEv.type(screen.getByLabelText(/password/i), "correct-horse-1");
    await userEv.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    resolveSignIn({ error: null });
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("shows a validation message in an aria-live region on invalid credentials, without navigating", async () => {
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    const userEv = userEvent.setup();

    render(<SignInForm hasGoogle={false} hasGithub={false} />);
    await userEv.type(screen.getByLabelText(/email/i), "alice@example.com");
    await userEv.type(screen.getByLabelText(/password/i), "wrong-password");
    await userEv.click(screen.getByRole("button", { name: /sign in/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(alert).toHaveTextContent(/incorrect email or password/i);
    expect(push).not.toHaveBeenCalled();
    // Re-enabled after the failed attempt, so the user can correct and retry.
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeEnabled();
  });

  it("renders social sign-in buttons only for the providers that are configured", () => {
    render(<SignInForm hasGoogle={true} hasGithub={false} />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue with github/i })).not.toBeInTheDocument();
  });
});
