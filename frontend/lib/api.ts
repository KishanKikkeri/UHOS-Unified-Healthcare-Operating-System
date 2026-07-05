import type {
  StockAlert,
  FacilitySummary,
  AlertExplanation,
  PulseEvent,
  Medicine,
  Patient,
  Doctor,
  PrescriptionCreate,
  PrescriptionResult,
  PatientHistory,
  DistrictAttendance,
  DistrictBeds,
  DistrictFootfall,
  DistrictTests,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail ? `: ${body.detail}` : "";
    } catch {
      // response wasn't JSON — ignore
    }
    throw new ApiError(res.status, `${path} failed with ${res.status}${detail}`);
  }
  return res.json() as Promise<T>;
}

/** All open alerts across every PHC/CHC — feeds Critical Alerts. */
export const getDistrictAlerts = () => request<StockAlert[]>("/district/alerts");

/** Every facility with its latest Pulse AI score — feeds Facility Health Scores. */
export const getDistrictFacilities = () =>
  request<FacilitySummary[]>("/district/facilities");

/** Structured explainability breakdown for one alert — feeds the Why Drawer. */
export const getAlertExplanation = (alertId: number) =>
  request<AlertExplanation>(`/district/alerts/${alertId}/explanation`);

/** Recent Event Engine log — feeds the Live Event Timeline. */
export const getRecentEvents = (limit = 20) =>
  request<PulseEvent[]>(`/events/recent?limit=${limit}`);

/** Medicine catalog lookup — used only to resolve id -> display name. */
export const getMedicines = () => request<Medicine[]>("/medicines");

/** Patient search/select for the Doctor Workspace. */
export const getPatients = (search?: string) =>
  request<Patient[]>(
    `/patients${search ? `?search=${encodeURIComponent(search)}` : ""}`
  );

/** Doctor picker for the Doctor Workspace (no auth system in this build). */
export const getDoctors = () => request<Doctor[]>("/doctors");

/**
 * Hero Flow 1: submit a prescription. The response already carries the
 * per-item AI outcome (dispensed locally / redistribution / critical
 * shortage) and its explanation — nothing to compute on the frontend.
 */
export const createPrescription = (payload: PrescriptionCreate) =>
  request<PrescriptionResult>("/prescriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/**
 * Citizen Health App: unified view of a patient's appointments,
 * prescriptions, and dispensing history — powers all three data-backed
 * Citizen screens (Dashboard, Prescription Details, Medical History).
 * Already existed as an approved endpoint; nothing new added here.
 */
export const getPatientHistory = (patientId: number) =>
  request<PatientHistory>(`/patients/${patientId}/history`);

/**
 * Phase 5 — Healthcare Operations Extensions. Each feeds one District
 * Command Center card; same read-only-unless-noted rule as the rest of
 * this file.
 */

/** Doctor Attendance Card (Module 1). */
export const getDistrictAttendance = () =>
  request<DistrictAttendance>("/district/attendance");

export const markAttendance = (doctorId: number, status: "present" | "absent") =>
  request(`/doctors/${doctorId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

/** Bed Management Card (Module 2). */
export const getDistrictBeds = () => request<DistrictBeds>("/district/beds");

/** Patient Footfall Card (Module 3). */
export const getDistrictFootfall = () =>
  request<DistrictFootfall>("/district/footfall");

/** Test Availability Card (Module 4). */
export const getDistrictTests = () => request<DistrictTests>("/district/tests");

export { ApiError, API_BASE };
