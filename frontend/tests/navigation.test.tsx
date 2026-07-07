import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import { renderWithProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

/**
 * Phase 11 — RBAC changed the Sidebar's contract: it now shows only the
 * nav items the signed-in role is allowed to open (hidden, not merely
 * disabled), per the handover doc's "Do NOT simply disable them" rule.
 * These tests replace the old "every nav item always renders" checks.
 * Every assertion is wrapped in waitFor because AuthProvider resolves
 * the current session asynchronously (a GET /auth/me round trip) before
 * the Sidebar knows which role it's rendering for.
 */
describe("Navigation (RBAC-aware)", () => {
  it("shows a district admin every district-wide nav item, and none of the other roles' pages", async () => {
    mockFetchRoutes({}, TEST_USERS.district_admin);
    renderWithProviders(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Dashboard")).toBeInTheDocument());
    expect(screen.getByText("Facilities")).toBeInTheDocument();
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Patients")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();

    expect(screen.queryByText("Doctor Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Citizen App")).not.toBeInTheDocument();
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("Inventory")).not.toBeInTheDocument();
  });

  it("shows a doctor only Doctor Workspace and Patients", async () => {
    mockFetchRoutes({}, TEST_USERS.doctor);
    renderWithProviders(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Doctor Workspace")).toBeInTheDocument());
    expect(screen.getByText("Patients")).toBeInTheDocument();

    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Citizen App")).not.toBeInTheDocument();
    expect(screen.queryByText("Facilities")).not.toBeInTheDocument();
    expect(screen.queryByText("Alerts")).not.toBeInTheDocument();
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument();
  });

  it("shows a citizen only Citizen App", async () => {
    mockFetchRoutes({}, TEST_USERS.citizen);
    renderWithProviders(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Citizen App")).toBeInTheDocument());
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Doctor Workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Patients")).not.toBeInTheDocument();
  });

  it("shows a facility admin and a lab technician Operations, and a pharmacist Inventory", async () => {
    mockFetchRoutes({}, TEST_USERS.facility_admin);
    const { unmount } = renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByText("Operations")).toBeInTheDocument());
    expect(screen.queryByText("Inventory")).not.toBeInTheDocument();
    unmount();

    mockFetchRoutes({}, TEST_USERS.pharmacist);
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByText("Inventory")).toBeInTheDocument());
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });

  it("wires the visible nav items to their real routes", async () => {
    mockFetchRoutes({}, TEST_USERS.district_admin);
    renderWithProviders(<Sidebar />);

    await waitFor(() => expect(screen.getByText("Facilities")).toBeInTheDocument());

    expect(screen.getByText("Facilities").closest("a")).toHaveAttribute("href", "/facilities");
    expect(screen.getByText("Alerts").closest("a")).toHaveAttribute("href", "/alerts");
    expect(screen.getByText("Patients").closest("a")).toHaveAttribute("href", "/patients");
    expect(screen.getByText("Analytics").closest("a")).toHaveAttribute("href", "/analytics");
    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/dashboard");
  });
});
