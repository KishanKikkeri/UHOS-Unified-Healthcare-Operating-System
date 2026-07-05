/**
 * These mirror backend/app/schemas/schemas.py and the three Sprint-2
 * read-only additions in backend/app/api/routes_dashboard.py exactly.
 * The frontend never computes or infers business logic — every field
 * here is rendered as-is from the API response.
 */

export interface StockAlert {
  id: number;
  phc_id: number;
  medicine_id: number;
  days_remaining: number;
  recommended_transfer_qty: number | null;
  recommended_source_phc_id: number | null;
  reasoning: string | null;
  status: "open" | "resolved";
}

export interface FacilitySummary {
  phc_id: number;
  name: string;
  district: string;
  type: "PHC" | "CHC";
  lat: number;
  lng: number;
  score: number;
  medicine_score: number;
  doctor_score: number;
}

export interface AlertExplanation {
  alert_id: number;
  current_stock: number;
  avg_daily_consumption: number;
  days_remaining: number;
  safety_threshold_days: number;
  recommended_transfer_qty: number | null;
  recommended_source_phc_id: number | null;
  recommended_source_phc_name: string | null;
  distance_km: number | null;
  reasoning: string | null;
}

export interface Medicine {
  id: number;
  name: string;
  unit: string;
}

export type EventType =
  | "prescription_created"
  | "medicine_dispensed"
  | "stock_alert_generated"
  | string;

export interface PulseEvent {
  id: number;
  event_type: EventType;
  payload: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Sprint 3 (Doctor Workspace) types. These mirror the
 * `/patients`, `/doctors`, and `POST /prescriptions` contracts exactly —
 * same rule as above, the frontend renders what the backend returns.
 */

export interface Patient {
  id: number;
  name: string;
  dob: string | null;
  phc_home_id: number | null;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  phc_id: number;
  phc_name: string;
  status: "active" | "absent" | string;
}

export interface PrescriptionItemIn {
  medicine_id: number;
  quantity: number;
}

export interface PrescriptionCreate {
  patient_id: number;
  doctor_id: number;
  appointment_id?: number | null;
  items: PrescriptionItemIn[];
}

export type OutcomeStatus =
  | "dispensed_locally"
  | "dispensed_via_redistribution"
  | "critical_shortage";

export interface ItemOutcome {
  medicine_id: number;
  medicine_name: string;
  requested_qty: number;
  status: OutcomeStatus;
  recommendation: Record<string, unknown>;
  explanation: Record<string, unknown>;
}

export interface PrescriptionResult {
  prescription_id: number;
  patient_id: number;
  outcomes: ItemOutcome[];
}

/**
 * Sprint 4 (Citizen Health App) types. These mirror
 * `GET /patients/{id}/history` exactly — same rule as above, the frontend
 * only renders and reshapes-for-display what the backend already returns.
 * No new backend endpoints were needed for these three fields.
 */

export interface HistoryDispensingEvent {
  quantity: number;
  from_phc_id: number;
  was_redistributed: boolean;
  timestamp: string;
}

export interface HistoryPrescriptionItem {
  medicine: string;
  quantity_prescribed: number;
  dispensing_events: HistoryDispensingEvent[];
}

export interface HistoryPrescription {
  prescription_id: number;
  date: string;
  doctor_id: number;
  items: HistoryPrescriptionItem[];
}

export interface HistoryAppointment {
  id: number;
  doctor_id: number;
  phc_id: number;
  scheduled_at: string;
  status: string;
}

export interface PatientHistory {
  patient_id: number;
  prescriptions: HistoryPrescription[];
  appointments: HistoryAppointment[];
}

export type CitizenTab = "dashboard" | "prescriptions" | "history" | "reports";
