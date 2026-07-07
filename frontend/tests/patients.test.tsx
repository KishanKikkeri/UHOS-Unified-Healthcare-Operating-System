import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import PatientsPage from "@/app/patients/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/patients",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
}));

describe("Patients page", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/patients/1/history": {
        patient_id: 1,
        prescriptions: [
          {
            prescription_id: 5,
            date: "2026-07-01T10:00:00Z",
            doctor_id: 1,
            items: [
              { medicine: "Paracetamol", quantity_prescribed: 10, dispensing_events: [] },
            ],
          },
        ],
        appointments: [],
      },
      "/patients/1/referrals": [
        {
          id: 9,
          patient_id: 1,
          doctor_id: 1,
          source_facility_id: 1,
          destination_facility_id: 2,
          service_name: "MRI",
          distance_km: 4.1,
          status: "confirmed",
          bed_unit_id: 3,
          assigned_bed_number: "G-12",
          destination_facility_name: "District Hospital",
          reasoning: "Nearest facility offering MRI.",
          created_at: "2026-07-02T10:00:00Z",
        },
      ],
      "/patients": [{ id: 1, name: "Asha Patel", dob: "1990-01-01", phc_home_id: 1 }],
      "/doctors": [
        { id: 1, name: "Dr. Rao", specialization: "General Medicine", phc_id: 1, phc_name: "PHC Alpha", status: "active" },
      ],
      "/district/facilities": [
        { phc_id: 1, name: "PHC Alpha", district: "Mysuru", type: "PHC", lat: 1, lng: 1, score: 80, medicine_score: 80, doctor_score: 80 },
      ],
    });
  });

  it("looks up a patient and shows their facility, referral status, and timeline", async () => {
    renderWithProviders(<PatientsPage />);

    const searchInput = await waitFor(() => screen.getByPlaceholderText(/Search patient/i));
    fireEvent.change(searchInput, { target: { value: "Asha" } });
    await waitFor(() => screen.getByText("Asha Patel"));
    fireEvent.click(screen.getByText("Asha Patel"));

    await waitFor(() => {
      expect(screen.getByText("PHC Alpha")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("District Hospital")).toBeInTheDocument();
    });
    expect(screen.getByText(/Bed G-12 Reserved/)).toBeInTheDocument();
    expect(screen.getByText(/Prescription Created/)).toBeInTheDocument();
  });
});
