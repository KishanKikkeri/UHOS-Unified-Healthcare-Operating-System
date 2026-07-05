import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import { renderWithProviders } from "./test-utils";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Navigation", () => {
  it("renders every route without crashing", () => {
    renderWithProviders(<Sidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Doctor Workspace")).toBeInTheDocument();
    expect(screen.getByText("Citizen App")).toBeInTheDocument();
  });

  it("marks disabled nav items (no route yet) as non-interactive", () => {
    renderWithProviders(<Sidebar />);

    const facilities = screen.getByText("Facilities").closest("button");
    expect(facilities).toBeDisabled();
  });

  it("wires real routes to Link elements with correct hrefs", () => {
    renderWithProviders(<Sidebar />);

    const doctorLink = screen.getByText("Doctor Workspace").closest("a");
    expect(doctorLink).toHaveAttribute("href", "/doctor");

    const citizenLink = screen.getByText("Citizen App").closest("a");
    expect(citizenLink).toHaveAttribute("href", "/citizen");
  });
});
