import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import CitizenAppPage from "@/app/citizen/page";
import { renderWithProviders, mockFetchRoutes } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/citizen",
}));

describe("Citizen App", () => {
  beforeEach(() => {
    mockFetchRoutes({
      "/patients?": [{ id: 1, name: "Asha Patel", dob: "1990-01-01", phc_home_id: 1 }],
      "/patients/1/history": {
        patient_id: 1,
        prescriptions: [],
        appointments: [],
      },
    });
  });

  it("prompts for a patient before showing tabs", () => {
    renderWithProviders(<CitizenAppPage />);
    expect(screen.getByText(/Select a patient/i)).toBeInTheDocument();
  });

  it("shows the timeline tabs once a patient is selected", async () => {
    renderWithProviders(<CitizenAppPage />);

    const input = screen.getByPlaceholderText(/Search patient/i);
    fireEvent.change(input, { target: { value: "Asha" } });
    await waitFor(() => screen.getByText("Asha Patel"));
    fireEvent.click(screen.getByText("Asha Patel"));

    await waitFor(() => {
      expect(screen.getByText("Medical History")).toBeInTheDocument();
    });
    expect(screen.getByText("Prescriptions")).toBeInTheDocument();
    expect(screen.getAllByText("Reports").length).toBeGreaterThan(0);
  });
});
