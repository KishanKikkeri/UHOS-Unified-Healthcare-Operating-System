import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import DoctorWorkspacePage from "@/app/doctor/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/doctor",
}));

describe("Doctor Workspace", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/doctors": [
        { id: 1, name: "Dr. Rao", specialization: "General Medicine", phc_id: 1, phc_name: "PHC Alpha", status: "active" },
      ],
      "/patients": [{ id: 1, name: "Asha Patel", dob: "1990-01-01", phc_home_id: 1 }],
      "/medicines": [{ id: 1, name: "Paracetamol", unit: "tablets" }],
      "/prescriptions": {
        prescription_id: 42,
        patient_id: 1,
        outcomes: [
          {
            medicine_id: 1,
            medicine_name: "Paracetamol",
            quantity: 5,
            status: "dispensed_locally",
            recommendation: null,
          },
        ],
      },
    });
  });

  it("renders the doctor and patient pickers", async () => {
    renderWithProviders(<DoctorWorkspacePage />);
    expect(screen.getByText("New Prescription")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Select a doctor/i)).toBeInTheDocument();
    });
  });

  it("submits a prescription and shows the outcome", async () => {
    renderWithProviders(<DoctorWorkspacePage />);

    await waitFor(() => screen.getByText(/Select a doctor/i));

    const doctorSelect = screen.getByText(/Select a doctor/i).closest("select")!;
    fireEvent.change(doctorSelect, { target: { value: "1" } });

    const patientInput = screen.getByPlaceholderText(/Search patient/i);
    fireEvent.change(patientInput, { target: { value: "Asha" } });
    await waitFor(() => screen.getByText("Asha Patel"));
    fireEvent.click(screen.getByText("Asha Patel"));

    await waitFor(() => screen.getByText(/Select medicine/i));
    const medicineSelect = screen.getByText(/Select medicine/i).closest("select")!;
    fireEvent.change(medicineSelect, { target: { value: "1" } });

    const qtyInput = screen.getByPlaceholderText("Qty");
    fireEvent.change(qtyInput, { target: { value: "5" } });

    const submitButton = screen.getByRole("button", { name: /Submit Prescription/i });
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/#42/)).toBeInTheDocument();
    });
  });
});
