// B4: minimum-viable frontend coverage — not full coverage, just enough to
// eliminate the "zero frontend tests" gap for the two most security- and
// accessibility-relevant screens in the app.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConsentForm from "@/components/oauth/ConsentForm";

const client = {
  name: "Acme Notes",
  description: "A notes app.",
  logoUrl: "https://client.example/logo.png",
};
const scopes = [{ name: "profile:read", description: "Read your profile" }];
const user = { email: "alice@example.com" };
const formValues = { client_id: "abc", redirect_uri: "https://client.example/callback" };

beforeEach(() => {
  global.fetch = vi.fn();
  delete window.location;
  window.location = { href: "" };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConsentForm", () => {
  it("renders the client name and the logo's alt text", () => {
    render(<ConsentForm client={client} scopes={scopes} user={user} formValues={formValues} />);
    expect(screen.getByRole("heading", { name: "Acme Notes" })).toBeInTheDocument();
    expect(screen.getByAltText("Acme Notes logo")).toBeInTheDocument();
  });

  it("shows a focus-visible Approve and Deny button, both enabled before submitting", () => {
    render(<ConsentForm client={client} scopes={scopes} user={user} formValues={formValues} />);
    const approve = screen.getByRole("button", { name: "Approve" });
    const deny = screen.getByRole("button", { name: "Deny" });
    expect(approve).toBeEnabled();
    expect(deny).toBeEnabled();
    // focus-visible outline is applied via these utility classes — this is
    // a regression guard, not a full a11y audit.
    expect(approve.className).toMatch(/focus-visible:outline/);
    expect(deny.className).toMatch(/focus-visible:outline/);
  });

  it("redirects the browser when approval succeeds", async () => {
    global.fetch.mockResolvedValue({ json: async () => ({ redirect: "https://client.example/callback?code=abc" }) });
    const userEv = userEvent.setup();

    render(<ConsentForm client={client} scopes={scopes} user={user} formValues={formValues} />);
    await userEv.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(window.location.href).toBe("https://client.example/callback?code=abc"));
  });

  it("shows an aria-live error region instead of redirecting when the server rejects the decision", async () => {
    global.fetch.mockResolvedValue({ json: async () => ({ error: "access_denied", message: "Client is disabled." }) });
    const userEv = userEvent.setup();

    render(<ConsentForm client={client} scopes={scopes} user={user} formValues={formValues} />);
    await userEv.click(screen.getByRole("button", { name: "Approve" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
    expect(alert).toHaveTextContent("Client is disabled.");
    expect(window.location.href).toBe(""); // never redirected
  });

  it("re-enables the buttons after a failed submission so the user can retry", async () => {
    global.fetch.mockResolvedValue({ json: async () => ({ error: "server_error", message: "Try again." }) });
    const userEv = userEvent.setup();

    render(<ConsentForm client={client} scopes={scopes} user={user} formValues={formValues} />);
    const approve = screen.getByRole("button", { name: "Approve" });
    await userEv.click(approve);

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Deny" })).toBeEnabled();
  });
});
