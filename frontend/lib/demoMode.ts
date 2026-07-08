import type { Role } from "./rbac";

/**
 * Phase 12 — Demo Mode.
 *
 * `NEXT_PUBLIC_*` env vars are inlined at build time by Next.js, so this
 * is a plain constant (not a function) -- consistent with how
 * `NEXT_PUBLIC_API_BASE_URL` is read directly in lib/api.ts. Independent
 * of the backend's own `DEMO_MODE` flag: this one only controls what the
 * UI *offers* (role cards) vs. hiding them; the backend's flag is what
 * actually allows POST /auth/demo-login to succeed.
 *
 * Defaults to ON: this is a hackathon/judging build, and requiring an
 * env var just to see the demo cards was exactly the kind of friction
 * Demo Mode exists to remove. Set NEXT_PUBLIC_DEMO_MODE=false explicitly
 * to require real username/password login instead.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

interface DemoRoleMeta {
  role: Role;
  emoji: string;
  title: string;
  description: string;
}

/** Display order matches the handover doc's role list exactly. */
export const DEMO_ROLES: DemoRoleMeta[] = [
  {
    role: "district_admin",
    emoji: "🏛",
    title: "District Administrator",
    description: "District-wide command center: facilities, alerts, analytics, and referrals.",
  },
  {
    role: "facility_admin",
    emoji: "🏥",
    title: "PHC Administrator",
    description: "Runs day-to-day operations for one facility — beds, tests, and staffing.",
  },
  {
    role: "doctor",
    emoji: "👨‍⚕️",
    title: "Doctor",
    description: "Prescribes, refers, and allocates beds from the Doctor Workspace.",
  },
  {
    role: "pharmacist",
    emoji: "💊",
    title: "Pharmacist",
    description: "Tracks medicine inventory and open stock alerts.",
  },
  {
    role: "lab_technician",
    emoji: "🧪",
    title: "Lab Technician",
    description: "Manages diagnostic test availability at their facility.",
  },
  {
    role: "citizen",
    emoji: "👤",
    title: "Citizen",
    description: "Views appointments, prescriptions, and referral status.",
  },
];
