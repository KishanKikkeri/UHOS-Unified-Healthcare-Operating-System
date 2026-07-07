import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import FacilitiesPage from "@/app/facilities/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/facilities",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

describe("Facilities page", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/district/facilities": [
        { phc_id: 1, name: "PHC Alpha", district: "Mysuru", type: "PHC", lat: 1, lng: 1, score: 92, medicine_score: 90, doctor_score: 94 },
      ],
      "/district/attendance": {
        date: "2026-07-05",
        present: 3,
        absent: 1,
        total: 4,
        attendance_pct: 75,
        facilities: [
          { facility_id: 1, date: "2026-07-05", present: 3, absent: 1, total: 4, attendance_pct: 75, is_alert: false, doctors: [] },
        ],
      },
      "/district/beds": {
        total: 20,
        occupied: 10,
        reserved: 2,
        available: 8,
        occupancy_pct: 50,
        facilities: [
          { facility_id: 1, total: 20, occupied: 10, reserved: 2, available: 8, occupancy_pct: 50, is_alert: false, calculation: "" },
        ],
      },
      "/district/footfall": {
        facility_id: null,
        today_patients: 12,
        weekly_total: 84,
        peak_hour: "10:00",
        expected_tomorrow: 9,
        calculation: "",
        facilities: [
          { facility_id: 1, today_patients: 12, weekly_total: 84, peak_hour: "10:00", expected_tomorrow: 9, calculation: "" },
        ],
      },
      "/district/tests": {
        availability_pct: 90,
        facilities: [
          { facility_id: 1, available_tests: ["Blood Test"], unavailable_tests: [], availability_pct: 90, alerts: [] },
        ],
      },
      "/facilities/1/services": {
        facility_id: 1,
        services: [{ id: 1, service_name: "X-Ray", category: "Diagnostics", available: true }],
      },
      "/facilities/1/wards": {
        facility_id: 1,
        wards: [{ ward: "General Ward", total: 10, available: 5, reserved: 1, occupied: 4, other: 0 }],
      },
      "/doctors": [
        { id: 1, name: "Dr. Rao", specialization: "General Medicine", phc_id: 1, phc_name: "PHC Alpha", status: "active" },
      ],
    });
  });

  it("renders facility cards with district data", async () => {
    renderWithProviders(<FacilitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("PHC Alpha")).toBeInTheDocument();
    });
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("opens the Services tab and shows facility services", async () => {
    renderWithProviders(<FacilitiesPage />);

    await waitFor(() => screen.getByText("PHC Alpha"));
    fireEvent.click(screen.getByText("View Services"));

    await waitFor(() => {
      expect(screen.getByText("X-Ray")).toBeInTheDocument();
    });
  });

  it("opens the Beds tab and shows ward breakdown", async () => {
    renderWithProviders(<FacilitiesPage />);

    await waitFor(() => screen.getByText("PHC Alpha"));
    fireEvent.click(screen.getByText("View Beds"));

    await waitFor(() => {
      expect(screen.getByText("General Ward")).toBeInTheDocument();
    });
  });

  it("opens the Doctors tab and shows facility doctors", async () => {
    renderWithProviders(<FacilitiesPage />);

    await waitFor(() => screen.getByText("PHC Alpha"));
    fireEvent.click(screen.getByText("View Doctors"));

    await waitFor(() => {
      expect(screen.getByText("Dr. Rao")).toBeInTheDocument();
    });
  });
});
