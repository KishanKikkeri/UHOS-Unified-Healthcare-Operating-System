import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import type { AuthUser } from "@/lib/types";
import type { Role } from "@/lib/rbac";

/** Phase 11 — one believable test user per role, shaped exactly like
 * AuthUser (backend/app/schemas/auth.py's UserOut). Used as the default
 * GET /auth/me response by mockFetchRoutes below. */
export const TEST_USERS: Record<Role, AuthUser> = {
  district_admin: {
    id: 1,
    username: "admin",
    full_name: "Test District Admin",
    role: "district_admin",
    facility_id: null,
    facility_name: null,
    doctor_id: null,
    patient_id: null,
  },
  facility_admin: {
    id: 2,
    username: "phc_admin",
    full_name: "Test Facility Admin",
    role: "facility_admin",
    facility_id: 1,
    facility_name: "PHC Alpha",
    doctor_id: null,
    patient_id: null,
  },
  doctor: {
    id: 3,
    username: "doctor01",
    full_name: "Dr. Test Doctor",
    role: "doctor",
    facility_id: 1,
    facility_name: "PHC Alpha",
    doctor_id: 1,
    patient_id: null,
  },
  pharmacist: {
    id: 4,
    username: "pharma01",
    full_name: "Test Pharmacist",
    role: "pharmacist",
    facility_id: 1,
    facility_name: "PHC Alpha",
    doctor_id: null,
    patient_id: null,
  },
  lab_technician: {
    id: 5,
    username: "lab01",
    full_name: "Test Lab Technician",
    role: "lab_technician",
    facility_id: 1,
    facility_name: "PHC Alpha",
    doctor_id: null,
    patient_id: null,
  },
  citizen: {
    id: 6,
    username: "patient01",
    full_name: "Test Citizen",
    role: "citizen",
    facility_id: null,
    facility_name: null,
    doctor_id: null,
    patient_id: 1,
  },
};

/** Wraps a component under test with the same providers app/layout.tsx applies. */
export function renderWithProviders(ui: ReactElement) {
  return render(
    <LanguageProvider>
      <AuthProvider>{ui}</AuthProvider>
    </LanguageProvider>
  );
}

/** Same wrapper, exposed as a plain function (not a render call) for
 * tests that need to call RTL's own `render`/`rerender` directly. */
export function withProviders(ui: ReactElement) {
  return (
    <LanguageProvider>
      <AuthProvider>{ui}</AuthProvider>
    </LanguageProvider>
  );
}

/**
 * Installs a global.fetch mock that resolves based on which path substring
 * matches, so each test only has to declare the endpoints it actually
 * touches. Unmatched paths resolve to an empty array/object so unrelated
 * background polling in a component under test doesn't throw or hang.
 *
 * Phase 11: also seeds a fake auth token in localStorage and defaults
 * GET /auth/me to a district_admin test user (override via the second
 * argument, or pass `authUser: null` to simulate a logged-out session)
 * so every pre-Phase-11 test keeps working against AuthGuard-wrapped
 * pages without having to know about auth at all.
 */
export function mockFetchRoutes(
  routes: Record<string, unknown>,
  authUser: AuthUser | null = TEST_USERS.district_admin
) {
  if (authUser) {
    window.localStorage.setItem("uhos.auth.token", "test-token");
  } else {
    window.localStorage.removeItem("uhos.auth.token");
  }

  const allRoutes = authUser ? { "/auth/me": authUser, ...routes } : routes;

  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const matches = Object.keys(allRoutes).filter((path) => url.includes(path));
    // Prefer the most specific (longest) match so e.g. "/patients/1/history"
    // resolves against the "/history" route rather than the broader
    // "/patients" list route.
    const match = matches.sort((a, b) => b.length - a.length)[0];
    const body = match ? allRoutes[match] : [];
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
}
