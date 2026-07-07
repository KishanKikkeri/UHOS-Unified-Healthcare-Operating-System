/**
 * Phase 11 — Authentication & RBAC.
 *
 * Mirrors backend/app/utils/rbac.py's ROLES / ROLE_HOME_ROUTE by hand
 * (same "hand-kept in sync" pattern as messages/*.json across languages).
 * This is the single source of truth the frontend uses for:
 *   - which sidebar nav items a given role sees
 *   - which routes a given role is allowed to open directly
 *   - where to redirect a role immediately after login
 */

export type Role =
  | "district_admin"
  | "facility_admin"
  | "doctor"
  | "pharmacist"
  | "lab_technician"
  | "citizen";

export const ROLES: Role[] = [
  "district_admin",
  "facility_admin",
  "doctor",
  "pharmacist",
  "lab_technician",
  "citizen",
];

export const ROLE_LABELS: Record<Role, string> = {
  district_admin: "District Admin",
  facility_admin: "Facility Admin",
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  lab_technician: "Lab Technician",
  citizen: "Citizen",
};

/** Where to send a user immediately after a successful login. */
export const ROLE_HOME_ROUTE: Record<Role, string> = {
  district_admin: "/dashboard",
  facility_admin: "/operations",
  doctor: "/doctor",
  pharmacist: "/inventory",
  lab_technician: "/operations",
  citizen: "/citizen",
};

/**
 * Route -> roles allowed to open it, per the Phase 11 handover doc's
 * "Route Protection" table. `/login` and `/` (the public landing page)
 * are intentionally absent -- they're open to everyone, logged in or not.
 */
export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["district_admin"],
  "/analytics": ["district_admin"],
  "/alerts": ["district_admin"],
  "/facilities": ["district_admin"],
  "/patients": ["district_admin", "doctor"],
  "/doctor": ["doctor"],
  "/citizen": ["citizen"],
  "/operations": ["facility_admin", "doctor", "lab_technician"],
  "/inventory": ["pharmacist"],
};

/** Sidebar nav entries, each gated to the roles allowed to see them. */
export const NAV_ACCESS: Record<string, Role[]> = ROUTE_ACCESS;

export function isRouteAllowed(pathname: string, role: Role | undefined): boolean {
  if (!role) return false;
  const allowed = ROUTE_ACCESS[pathname];
  // Routes not listed in the matrix (e.g. future additive pages) default
  // to "no restriction" rather than silently locking everyone out.
  if (!allowed) return true;
  return allowed.includes(role);
}

export function homeRouteFor(role: Role): string {
  return ROLE_HOME_ROUTE[role] ?? "/dashboard";
}
