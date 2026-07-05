import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import DoctorAttendanceCard from "@/components/operations/DoctorAttendanceCard";
import BedManagementCard from "@/components/operations/BedManagementCard";
import PatientFootfallCard from "@/components/operations/PatientFootfallCard";
import TestAvailabilityCard from "@/components/operations/TestAvailabilityCard";
import { renderWithProviders } from "./test-utils";
import type {
  DistrictAttendance,
  DistrictBeds,
  DistrictFootfall,
  DistrictTests,
} from "@/lib/types";

const attendance: DistrictAttendance = {
  date: "2026-07-05",
  present: 3,
  absent: 1,
  total: 4,
  attendance_pct: 75,
  facilities: [],
};

const beds: DistrictBeds = {
  total: 20,
  occupied: 10,
  reserved: 2,
  available: 8,
  occupancy_pct: 50,
  facilities: [],
};

const footfall: DistrictFootfall = {
  facility_id: null,
  today_patients: 12,
  weekly_total: 84,
  peak_hour: "10:00",
  expected_tomorrow: 9,
  calculation: "84 / 7 = 12",
  facilities: [],
};

const tests: DistrictTests = {
  availability_pct: 90,
  facilities: [],
};

describe("Operations cards", () => {
  it("renders Doctor Attendance data", () => {
    renderWithProviders(<DoctorAttendanceCard data={attendance} />);
    expect(screen.getByText("Doctor Attendance")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders Bed Management data", () => {
    renderWithProviders(<BedManagementCard data={beds} />);
    expect(screen.getByText("Beds")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders Patient Footfall data", () => {
    renderWithProviders(<PatientFootfallCard data={footfall} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders Test Availability data", () => {
    renderWithProviders(<TestAvailabilityCard data={tests} />);
    expect(screen.getByText(/Test Availability/i)).toBeInTheDocument();
  });

  it("shows loading states when data hasn't arrived yet", () => {
    renderWithProviders(<BedManagementCard data={null} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
