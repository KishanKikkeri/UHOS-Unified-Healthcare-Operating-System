import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import AlertsPage from "@/app/alerts/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/alerts",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

describe("Alerts page", () => {
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
          created_at: "2026-07-05T10:00:00Z",
        },
        {
          id: 2,
          phc_id: 2,
          medicine_id: 2,
          days_remaining: 6,
          recommended_transfer_qty: null,
          recommended_source_phc_id: null,
          reasoning: "Trending down",
          status: "open",
          created_at: "2026-07-05T09:00:00Z",
        },
      ],
      "/district/facilities": [
        { phc_id: 1, name: "PHC Alpha", district: "Mysuru", type: "PHC", lat: 1, lng: 1, score: 80, medicine_score: 80, doctor_score: 80 },
        { phc_id: 2, name: "CHC Beta", district: "Mysuru", type: "CHC", lat: 1, lng: 1, score: 70, medicine_score: 70, doctor_score: 70 },
      ],
      "/medicines": [
        { id: 1, name: "Paracetamol", unit: "tablets" },
        { id: 2, name: "ORS", unit: "packets" },
      ],
      "/district/alerts/1/explanation": {
        alert_id: 1,
        current_stock: 2,
        avg_daily_consumption: 1.5,
        days_remaining: 1.2,
        safety_threshold_days: 5,
        recommended_transfer_qty: 10,
        recommended_source_phc_id: 2,
        recommended_source_phc_name: "CHC Beta",
        distance_km: 8.4,
        reasoning: "Stock expected to exhaust before safety threshold.",
      },
    });
  });

  it("groups alerts by severity", async () => {
    renderWithProviders(<AlertsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Paracetamol/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Critical \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Information \(1\)/)).toBeInTheDocument();
  });

  it("filters by facility", async () => {
    renderWithProviders(<AlertsPage />);

    await waitFor(() => screen.getByText(/Paracetamol/));

    const facilitySelect = screen.getByDisplayValue("All Facilities");
    fireEvent.change(facilitySelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.queryByText(/Paracetamol/)).not.toBeInTheDocument();
      expect(screen.getByText(/ORS/)).toBeInTheDocument();
    });
  });

  it("opens the Why Drawer for an alert", async () => {
    renderWithProviders(<AlertsPage />);

    await waitFor(() => screen.getByText(/Paracetamol/));
    fireEvent.click(screen.getAllByText("WHY?")[0]);

    await waitFor(() => {
      expect(screen.getByText("8.4 km")).toBeInTheDocument();
    });
  });
});
