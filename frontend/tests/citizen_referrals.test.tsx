import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import CitizenAppPage from "@/app/citizen/page";
import { renderWithProviders, mockFetchRoutes, TEST_USERS } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/citizen",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

describe("Citizen App — My Referrals tab", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/patients?": [{ id: 1, name: "Asha Patel", dob: "1990-01-01", phc_home_id: 1 }],
      "/patients/1/history": {
        patient_id: 1,
        prescriptions: [],
        appointments: [],
      },
      "/patients/1/referrals": [
        {
          id: 7,
          patient_id: 1,
          doctor_id: 1,
          source_facility_id: 1,
          destination_facility_id: 4,
          service_name: "MRI",
          distance_km: 18.3,
          status: "confirmed",
          bed_unit_id: 10,
          reasoning: "Nearest MRI with available bed.",
          created_at: new Date().toISOString(),
          destination_facility_name: "Mysuru District Hospital",
          assigned_bed_number: "G-12",
        },
      ],
    }, TEST_USERS.citizen);
  });

  it("shows the citizen's referral with destination, status, and reserved bed", async () => {
    renderWithProviders(<CitizenAppPage />);

    const input = await waitFor(() => screen.getByPlaceholderText(/Search patient/i));
    fireEvent.change(input, { target: { value: "Asha" } });
    await waitFor(() => screen.getByText("Asha Patel"));
    fireEvent.click(screen.getByText("Asha Patel"));

    await waitFor(() => screen.getByText("My Referrals"));
    fireEvent.click(screen.getByText("My Referrals"));

    await waitFor(() => {
      expect(screen.getByText("Mysuru District Hospital")).toBeInTheDocument();
    });
    expect(screen.getByText(/Bed G-12 Reserved/)).toBeInTheDocument();
    expect(screen.getByText("confirmed")).toBeInTheDocument();
  });
});
