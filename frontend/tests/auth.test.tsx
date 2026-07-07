import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent, render } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { getStoredToken } from "@/lib/api";
import { mockFetchRoutes, TEST_USERS } from "./test-utils";

/** Minimal consumer component so we can exercise useAuth() end-to-end
 * through real DOM interactions rather than calling the hook in isolation. */
function Probe() {
  const { user, loading, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="state">
        {loading ? "loading" : user ? `logged-in:${user.username}:${user.role}` : "logged-out"}
      </p>
      <button onClick={() => login("admin", "admin123")}>do-login</button>
      <button onClick={() => logout()}>do-logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts logged out when no token is stored", async () => {
    mockFetchRoutes({}, null);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-out");
    });
  });

  it("logs in, stores a token, and exposes the returned user", async () => {
    mockFetchRoutes(
      {
        "/auth/login": {
          access_token: "abc123",
          token_type: "bearer",
          expires_in: 28800,
          user: TEST_USERS.district_admin,
        },
      },
      null
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => screen.getByText("do-login"));
    fireEvent.click(screen.getByText("do-login"));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-in:admin:district_admin");
    });
    expect(getStoredToken()).toBe("abc123");
  });

  it("restores a persistent session from a stored token on mount", async () => {
    window.localStorage.setItem("uhos.auth.token", "existing-token");
    mockFetchRoutes({}, TEST_USERS.doctor);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-in:doctor01:doctor");
    });
  });

  it("clears an invalid/expired stored token instead of crashing", async () => {
    window.localStorage.setItem("uhos.auth.token", "stale-token");
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Not authenticated" }),
    })) as unknown as typeof fetch;

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-out");
    });
    expect(getStoredToken()).toBeNull();
  });

  it("logs out and clears the stored token", async () => {
    mockFetchRoutes(
      {
        "/auth/logout": { detail: "Logged out" },
      },
      TEST_USERS.pharmacist
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-in:pharma01:pharmacist");
    });

    fireEvent.click(screen.getByText("do-logout"));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("logged-out");
    });
    expect(getStoredToken()).toBeNull();
  });
});
