import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import RoleSelectionSection from "@/components/landing/RoleSelectionSection";
import DemoModeBadge from "@/components/DemoModeBadge";
import AuthGuard from "@/components/AuthGuard";
import { renderWithProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));

// lib/demoMode.ts reads NEXT_PUBLIC_DEMO_MODE, a build-time env var --
// mocked here so tests can exercise both the on and off states without
// needing a real Next.js build per state.
vi.mock("@/lib/demoMode", async () => {
  const actual = await vi.importActual<typeof import("@/lib/demoMode")>("@/lib/demoMode");
  return { ...actual, DEMO_MODE: true };
});

describe("Demo Mode — role selection cards", () => {
  it("renders a card for every role from the handover doc", async () => {
    mockFetchRoutes({}, null);
    renderWithProviders(<RoleSelectionSection />);

    expect(screen.getByText("Select Your Role")).toBeInTheDocument();
    expect(screen.getByText("District Administrator")).toBeInTheDocument();
    expect(screen.getByText("PHC Administrator")).toBeInTheDocument();
    expect(screen.getByText("Doctor")).toBeInTheDocument();
    expect(screen.getByText("Pharmacist")).toBeInTheDocument();
    expect(screen.getByText("Lab Technician")).toBeInTheDocument();
    expect(screen.getByText("Citizen")).toBeInTheDocument();
    expect(screen.getAllByText("Enter Workspace").length).toBe(6);
  });

  it("clicking a card logs in as that role, stores a token, and redirects to the role's home route", async () => {
    replaceMock.mockClear();
    mockFetchRoutes(
      {
        "/auth/demo-login": {
          access_token: "demo-jwt-doctor",
          token_type: "bearer",
          expires_in: 28800,
          user: TEST_USERS.doctor,
        },
      },
      null
    );

    renderWithProviders(<RoleSelectionSection />);

    fireEvent.click(screen.getByText("Doctor").closest("button")!);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/doctor");
    });
    expect(window.localStorage.getItem("uhos.auth.token")).toBe("demo-jwt-doctor");
  });

  it("shows an error if the backend has Demo Mode disabled (403)", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 403,
      json: async () => ({ detail: "Demo Mode is disabled." }),
    })) as unknown as typeof fetch;

    renderWithProviders(<RoleSelectionSection />);

    fireEvent.click(screen.getByText("Citizen").closest("button")!);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/demo mode is disabled on the backend/i);
    });
  });

  it("disables all cards while one demo login is pending", async () => {
    let resolveLogin: (v: unknown) => void = () => {};
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/auth/demo-login")) {
        return new Promise((resolve) => {
          resolveLogin = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                access_token: "t",
                token_type: "bearer",
                expires_in: 1,
                user: TEST_USERS.pharmacist,
              }),
            } as Response);
        });
      }
      return { ok: true, status: 200, json: async () => [] } as Response;
    }) as unknown as typeof fetch;

    renderWithProviders(<RoleSelectionSection />);

    fireEvent.click(screen.getByText("Pharmacist").closest("button")!);

    await waitFor(() => {
      const doctorButton = screen.getByText("Doctor").closest("button")!;
      expect(doctorButton).toBeDisabled();
    });

    resolveLogin(null);
    await waitFor(() => {
      expect(window.localStorage.getItem("uhos.auth.token")).toBe("t");
    });
  });
});

describe("Demo Mode badge", () => {
  it("renders the badge and its subtext when demo mode is enabled", () => {
    renderWithProviders(<DemoModeBadge />);
    expect(screen.getByText("Demo Mode Enabled")).toBeInTheDocument();
    expect(screen.getByText(/authentication bypassed for judging/i)).toBeInTheDocument();
  });
});

describe("AuthGuard accepts a demo-issued session", () => {
  it("renders protected content once a demo token resolves via GET /auth/me", async () => {
    mockFetchRoutes({}, TEST_USERS.lab_technician);

    renderWithProviders(
      <AuthGuard allowedRoles={["facility_admin", "doctor", "lab_technician"]}>
        <p>Operations Content</p>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Operations Content")).toBeInTheDocument();
    });
  });
});
