import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import AuthGuard from "@/components/AuthGuard";
import { ROLES, ROUTE_ACCESS, ROLE_HOME_ROUTE, isRouteAllowed, homeRouteFor } from "@/lib/rbac";
import { renderWithProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
}));

describe("RBAC config (lib/rbac.ts)", () => {
  it("gives every role a home route", () => {
    for (const role of ROLES) {
      expect(ROLE_HOME_ROUTE[role]).toBeDefined();
      expect(ROLE_HOME_ROUTE[role].startsWith("/")).toBe(true);
    }
  });

  it("matches the handover doc's route protection table", () => {
    expect(ROUTE_ACCESS["/dashboard"]).toEqual(["district_admin"]);
    expect(ROUTE_ACCESS["/analytics"]).toEqual(["district_admin"]);
    expect(ROUTE_ACCESS["/alerts"]).toEqual(["district_admin"]);
    expect(ROUTE_ACCESS["/facilities"]).toEqual(["district_admin"]);
    expect(ROUTE_ACCESS["/patients"]).toEqual(["district_admin", "doctor"]);
    expect(ROUTE_ACCESS["/doctor"]).toEqual(["doctor"]);
    expect(ROUTE_ACCESS["/citizen"]).toEqual(["citizen"]);
    expect(ROUTE_ACCESS["/operations"]).toEqual(["facility_admin", "doctor", "lab_technician"]);
    expect(ROUTE_ACCESS["/inventory"]).toEqual(["pharmacist"]);
  });

  it("isRouteAllowed respects the matrix", () => {
    expect(isRouteAllowed("/dashboard", "district_admin")).toBe(true);
    expect(isRouteAllowed("/dashboard", "doctor")).toBe(false);
    expect(isRouteAllowed("/patients", "doctor")).toBe(true);
    expect(isRouteAllowed("/patients", "citizen")).toBe(false);
    expect(isRouteAllowed("/dashboard", undefined)).toBe(false);
  });

  it("homeRouteFor matches the Auto Redirect table", () => {
    expect(homeRouteFor("district_admin")).toBe("/dashboard");
    expect(homeRouteFor("doctor")).toBe("/doctor");
    expect(homeRouteFor("citizen")).toBe("/citizen");
    expect(homeRouteFor("facility_admin")).toBe("/operations");
    expect(homeRouteFor("pharmacist")).toBe("/inventory");
    expect(homeRouteFor("lab_technician")).toBe("/operations");
  });
});

describe("AuthGuard", () => {
  it("renders protected content for an allowed role", async () => {
    mockFetchRoutes({}, TEST_USERS.district_admin);

    renderWithProviders(
      <AuthGuard allowedRoles={["district_admin"]}>
        <p>Secret Dashboard Content</p>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText("Secret Dashboard Content")).toBeInTheDocument();
    });
  });

  it("redirects to /login when nobody is signed in", async () => {
    replaceMock.mockClear();
    mockFetchRoutes({}, null);

    renderWithProviders(
      <AuthGuard allowedRoles={["district_admin"]}>
        <p>Secret Dashboard Content</p>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Secret Dashboard Content")).not.toBeInTheDocument();
  });

  it("redirects a signed-in user with the wrong role to their own home route", async () => {
    replaceMock.mockClear();
    mockFetchRoutes({}, TEST_USERS.doctor);

    renderWithProviders(
      <AuthGuard allowedRoles={["district_admin"]}>
        <p>Secret Dashboard Content</p>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/doctor");
    });
    expect(screen.queryByText("Secret Dashboard Content")).not.toBeInTheDocument();
  });

  it("allows any role explicitly listed, e.g. Operations for facility_admin, doctor, and lab_technician", async () => {
    for (const role of ["facility_admin", "doctor", "lab_technician"] as const) {
      window.localStorage.clear();
      mockFetchRoutes({}, TEST_USERS[role]);

      const { unmount } = renderWithProviders(
        <AuthGuard allowedRoles={["facility_admin", "doctor", "lab_technician"]}>
          <p>Operations Content</p>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText("Operations Content")).toBeInTheDocument();
      });
      unmount();
    }
  });
});
