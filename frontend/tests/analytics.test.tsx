import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import AnalyticsPage from "@/app/analytics/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

describe("Analytics page", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/district/facilities": [
        { phc_id: 1, name: "PHC Alpha", district: "Mysuru", type: "PHC", lat: 1, lng: 1, score: 60, medicine_score: 60, doctor_score: 60 },
        { phc_id: 2, name: "CHC Beta", district: "Mysuru", type: "CHC", lat: 1, lng: 1, score: 95, medicine_score: 95, doctor_score: 95 },
      ],
      "/district/alerts": [
        { id: 1, phc_id: 1, medicine_id: 1, days_remaining: 1, recommended_transfer_qty: null, recommended_source_phc_id: null, reasoning: "", status: "open", created_at: "2026-07-05T10:00:00Z" },
        { id: 2, phc_id: 1, medicine_id: 1, days_remaining: 1, recommended_transfer_qty: null, recommended_source_phc_id: null, reasoning: "", status: "open", created_at: "2026-07-05T10:00:00Z" },
      ],
      "/medicines": [{ id: 1, name: "Paracetamol", unit: "tablets" }],
      "/district/attendance": { date: "2026-07-05", present: 3, absent: 1, total: 4, attendance_pct: 75, facilities: [] },
      "/district/beds": { total: 20, occupied: 10, reserved: 2, available: 8, occupancy_pct: 50, facilities: [] },
      "/district/footfall": { facility_id: null, today_patients: 12, weekly_total: 84, peak_hour: "10:00", expected_tomorrow: 9, calculation: "", facilities: [] },
      "/district/referrals": { today_total: 4, today_successful: 3, today_pending: 1, today_emergency: 0, top_requested_service: "MRI" },
    });
  });

  it("ranks facilities by score, highest first", async () => {
    renderWithProviders(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("CHC Beta")).toBeInTheDocument();
    });

    const names = screen.getAllByText(/PHC Alpha|CHC Beta/).map((el) => el.textContent);
    expect(names[0]).toBe("CHC Beta");
    expect(names[1]).toBe("PHC Alpha");
  });

  it("shows medicine consumption pressure derived from open alerts", async () => {
    renderWithProviders(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Medicine Consumption Pressure")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    });
  });

  it("shows referral, bed, footfall, and attendance analytics", async () => {
    renderWithProviders(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText("Today's Referrals")).toBeInTheDocument();
    });
    expect(screen.getByText("Beds")).toBeInTheDocument();
    expect(screen.getByText("Patient Footfall")).toBeInTheDocument();
    expect(screen.getByText("Doctor Attendance")).toBeInTheDocument();
  });
});
