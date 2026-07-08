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
  FacilityServices,
  ServiceSearchResult,
  ReferralRecommendation,
  Referral,
  PatientReferral,
  BedUnit,
  FacilityWardSummary,
  DistrictWardSummary,
  DistrictReferralAnalytics,
  AuthUser,
  TokenResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Phase 11 — Authentication. Token lives in localStorage under this key;
// read fresh on every request rather than cached in a module variable, so
// a login/logout in another tab is picked up on the next call.
const TOKEN_STORAGE_KEY = "uhos.auth.token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
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

/**
 * Phase 11 — Authentication. Every existing function below this point is
 * untouched; `request()` now transparently attaches a bearer token when
 * one is present, so none of them needed to change to start sending auth.
 */
export const login = (username: string, password: string) =>
  request<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

export const logout = () => request<{ detail: string }>("/auth/logout", { method: "POST" });

export const getCurrentUser = () => request<AuthUser>("/auth/me");

/**
 * Phase 12 — Demo Mode. Same TokenResponse shape as login() above, just a
 * role instead of credentials -- see backend/app/api/routes_auth.py's
 * POST /auth/demo-login.
 */
export const demoLogin = (role: string) =>
  request<TokenResponse>("/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

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
export const getDoctors = (phcId?: number) =>
  request<Doctor[]>(`/doctors${phcId != null ? `?phc_id=${phcId}` : ""}`);

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

/**
 * Phase X — Smart Referral & Advanced Bed Management. Same rule as Phase 5
 * above: each function mirrors one `routes_referral.py` endpoint exactly.
 */

/** Module 2: Facility Services Directory. */
export const getFacilityServices = (facilityId: number) =>
  request<FacilityServices>(`/facilities/${facilityId}/services`);

export const searchServices = (name: string) =>
  request<ServiceSearchResult[]>(`/services/search?name=${encodeURIComponent(name)}`);

export const getAllServices = () =>
  request<{ service_name: string; category: string | null }[]>("/services");

/** Module 1: Smart Referral Engine. */
export const recommendReferral = (sourceFacilityId: number, serviceName: string) =>
  request<ReferralRecommendation>("/referrals/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_facility_id: sourceFacilityId, service_name: serviceName }),
  });

export const createReferral = (payload: {
  patient_id: number;
  doctor_id: number;
  source_facility_id: number;
  service_name: string;
}) =>
  request<{ referral: Referral; recommendation: ReferralRecommendation | null }>("/referrals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const getReferral = (referralId: number) =>
  request<Referral>(`/referrals/${referralId}`);

/** Module 5: Citizen Referral Tracking. */
export const getPatientReferrals = (patientId: number) =>
  request<PatientReferral[]>(`/patients/${patientId}/referrals`);

/** Referral Analytics (Nice to Have). */
export const getDistrictReferralAnalytics = () =>
  request<DistrictReferralAnalytics>("/district/referrals");

/** Module 3: Doctor Bed Allocation. */
export const listBedUnits = (facilityId: number, ward?: string) =>
  request<BedUnit[]>(`/facilities/${facilityId}/beds/units${ward ? `?ward=${encodeURIComponent(ward)}` : ""}`);

export const reserveBed = (
  bedId: number,
  payload: { patient_id: number; doctor_id: number; referral_id?: number | null }
) =>
  request<BedUnit>(`/beds/${bedId}/reserve`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const releaseBed = (bedId: number) =>
  request<BedUnit>(`/beds/${bedId}/release`, { method: "PUT" });

export const transferBed = (bedId: number, toBedId: number) =>
  request<{ from_bed: BedUnit; to_bed: BedUnit }>(`/beds/${bedId}/transfer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to_bed_id: toBedId }),
  });

/** Module 4: Ward-wise Bed Status. */
export const getFacilityWards = (facilityId: number) =>
  request<FacilityWardSummary>(`/facilities/${facilityId}/wards`);

export const getDistrictWards = () => request<DistrictWardSummary>("/district/wards");
