import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { renderWithProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/login",
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));

describe("Login page", () => {
  beforeEach(() => {
    replaceMock.mockClear();
  });

  it("renders username, password, remember me, and language selector", async () => {
    mockFetchRoutes({}, null); // not logged in

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show password/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    mockFetchRoutes({}, null);
    renderWithProviders(<LoginPage />);

    await waitFor(() => screen.getByLabelText("Password"));
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    fireEvent.click(screen.getByLabelText(/show password/i));
    expect(passwordInput.type).toBe("text");
  });

  it("logs in successfully and redirects to the role's home route", async () => {
    mockFetchRoutes(
      {
        "/auth/login": {
          access_token: "fake-jwt",
          token_type: "bearer",
          expires_in: 28800,
          user: TEST_USERS.doctor,
        },
      },
      null
    );

    renderWithProviders(<LoginPage />);

    await waitFor(() => screen.getByLabelText("Username"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "doctor01" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "doctor123" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/doctor");
    });
  });

  it("shows an error message on invalid credentials", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Incorrect username or password" }),
    })) as unknown as typeof fetch;

    renderWithProviders(<LoginPage />);

    await waitFor(() => screen.getByLabelText("Username"));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/incorrect username or password/i);
    });
    expect(replaceMock).not.toHaveBeenCalledWith("/dashboard");
  });

  it("redirects an already-authenticated user straight to their home route", async () => {
    mockFetchRoutes({}, TEST_USERS.citizen);

    renderWithProviders(<LoginPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/citizen");
    });
  });
});
