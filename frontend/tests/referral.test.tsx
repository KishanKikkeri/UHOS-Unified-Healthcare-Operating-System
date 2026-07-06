import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import DoctorWorkspacePage from "@/app/doctor/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/doctor",
}));

describe("Doctor Workspace — Smart Referral panel", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/doctors": [
        { id: 1, name: "Dr. Rao", specialization: "General Medicine", phc_id: 1, phc_name: "PHC Alpha", status: "active" },
      ],
      "/patients": [{ id: 1, name: "Asha Patel", dob: "1990-01-01", phc_home_id: 1 }],
      "/medicines": [],
      "/referrals/recommend": {
        recommended_facility_id: 4,
        recommended_facility_name: "District Hospital",
        service_name: "MRI",
        distance_km: 4.1,
        available_beds: 2,
        facility_load_pct: 20,
        reasoning: "Nearest facility offering MRI with an available bed.",
        alternatives: [],
      },
      "/facilities/4/beds/units": [
        { id: 10, facility_id: 4, bed_number: "G-12", ward: "General Ward", bed_type: "General", status: "available", assigned_patient_id: null, assigned_doctor_id: null, updated_at: "" },
      ],
      "/referrals": {
        referral: {
          id: 7,
          patient_id: 1,
          doctor_id: 1,
          source_facility_id: 1,
          destination_facility_id: 4,
          service_name: "MRI",
          distance_km: 4.1,
          status: "pending",
          bed_unit_id: null,
          reasoning: "Nearest facility offering MRI with an available bed.",
          created_at: new Date().toISOString(),
        },
        recommendation: null,
      },
    });
  });

  it("finds a recommended facility and creates a referral", async () => {
    renderWithProviders(<DoctorWorkspacePage />);

    await waitFor(() => screen.getByText(/Select a doctor/i));
    const doctorSelect = screen.getByText(/Select a doctor/i).closest("select")!;
    fireEvent.change(doctorSelect, { target: { value: "1" } });

    await waitFor(() => screen.getByText("Smart Referral"));

    const serviceInput = screen.getByPlaceholderText("e.g. MRI");
    fireEvent.change(serviceInput, { target: { value: "MRI" } });

    fireEvent.click(screen.getByRole("button", { name: /Find Facility/i }));

    await waitFor(() => {
      expect(screen.getByText("District Hospital")).toBeInTheDocument();
    });

    const patientInput = screen.getByPlaceholderText(/Search patient/i);
    fireEvent.change(patientInput, { target: { value: "Asha" } });
    await waitFor(() => screen.getByText("Asha Patel"));
    fireEvent.click(screen.getByText("Asha Patel"));

    fireEvent.click(screen.getByRole("button", { name: /Generate Referral/i }));

    await waitFor(() => {
      expect(screen.getByText(/#7/)).toBeInTheDocument();
    });
  });
});
