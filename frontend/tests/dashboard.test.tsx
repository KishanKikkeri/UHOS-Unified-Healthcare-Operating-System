import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/page";
import { renderWithProviders } from "./test-utils";
import { mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/ws", () => ({
  connectDashboardSocket: () => () => {},
}));

describe("Dashboard page", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/district/alerts": [
        {
          id: 1,
          phc_id: 1,
          medicine_id: 1,
          days_remaining: 1.2,
          recommended_transfer_qty: 10,
          recommended_source_phc_id: 2,
          reasoning: "Low stock",
          status: "open",
        },
      ],
      "/district/facilities": [
        { phc_id: 1, name: "PHC Alpha", district: "Mysuru", type: "PHC", lat: 1, lng: 1, score: 80, medicine_score: 80, doctor_score: 80 },
      ],
      "/district/attendance": { date: "2026-07-05", present: 1, absent: 0, total: 1, attendance_pct: 100, facilities: [] },
      "/district/beds": { total: 10, occupied: 2, reserved: 0, available: 8, occupancy_pct: 20, facilities: [] },
      "/district/footfall": { facility_id: null, today_patients: 5, weekly_total: 30, peak_hour: null, expected_tomorrow: 5, calculation: "", facilities: [] },
      "/district/tests": { availability_pct: 100, facilities: [] },
      "/medicines": [{ id: 1, name: "Paracetamol", unit: "tablets" }],
      "/events/recent": [],
    });
  });

  it("renders stat cards and the critical alert once data loads", async () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText("Critical Alerts")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("PHC Alpha").length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(screen.getByText(/Paracetamol/)).toBeInTheDocument();
    });
  });
});
