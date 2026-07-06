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

export type CitizenTab = "dashboard" | "prescriptions" | "history" | "reports" | "referrals";

/**
 * Phase X (Smart Referral & Advanced Bed Management) types. These mirror
 * `routes_referral.py` exactly -- same rule as above, the frontend only
 * renders what the backend returns.
 */

export interface FacilityServiceItem {
  id: number;
  service_name: string;
  category: string | null;
  available: boolean;
}

export interface FacilityServices {
  facility_id: number;
  services: FacilityServiceItem[];
}

export interface ServiceSearchResult {
  facility_id: number;
  facility_name: string;
  facility_type: string;
  lat: number;
  lng: number;
  service_name: string;
  category: string | null;
}

export interface ReferralRecommendation {
  recommended_facility_id: number | null;
  recommended_facility_name?: string;
  service_name: string;
  distance_km?: number;
  available_beds?: number;
  facility_load_pct?: number;
  reasoning: string;
  alternatives?: {
    facility_id: number;
    facility_name: string;
    distance_km: number;
    available_beds: number;
    facility_load_pct: number;
  }[];
}

export type ReferralStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Referral {
  id: number;
  patient_id: number;
  doctor_id: number;
  source_facility_id: number;
  destination_facility_id: number | null;
  service_name: string;
  distance_km: number | null;
  status: ReferralStatus;
  bed_unit_id: number | null;
  reasoning: string | null;
  created_at: string;
}

export interface PatientReferral extends Referral {
  destination_facility_name: string | null;
  assigned_bed_number: string | null;
}

export type BedUnitStatus = "available" | "reserved" | "occupied" | "cleaning" | "maintenance";

export interface BedUnit {
  id: number;
  facility_id: number;
  bed_number: string;
  ward: string;
  bed_type: string;
  status: BedUnitStatus;
  assigned_patient_id: number | null;
  assigned_doctor_id: number | null;
  updated_at: string;
}

export interface WardSummary {
  ward: string;
  total: number;
  available: number;
  reserved: number;
  occupied: number;
  other: number;
}

export interface FacilityWardSummary {
  facility_id: number;
  wards: WardSummary[];
}

export interface DistrictWardSummary {
  facilities: FacilityWardSummary[];
}

export interface DistrictReferralAnalytics {
  today_total: number;
  today_successful: number;
  today_pending: number;
  today_emergency: number;
  top_requested_service: string | null;
}

/**
 * Phase 5 (Healthcare Operations Extensions) types. These mirror
 * `routes_operations.py` exactly — same rule as above, the frontend only
 * renders what the backend returns.
 */

export interface AttendanceDoctor {
  doctor_id: number;
  doctor_name: string;
  facility_id: number;
  status: "present" | "absent";
  check_in_time: string | null;
}

export interface FacilityAttendance {
  facility_id: number;
  date: string;
  present: number;
  absent: number;
  total: number;
  attendance_pct: number;
  is_alert: boolean;
  doctors: AttendanceDoctor[];
}

export interface DistrictAttendance {
  date: string;
  present: number;
  absent: number;
  total: number;
  attendance_pct: number;
  facilities: FacilityAttendance[];
}

export interface FacilityBeds {
  facility_id: number;
  total: number;
  occupied: number;
  reserved: number;
  available: number;
  occupancy_pct: number;
  is_alert: boolean;
  calculation: string;
}

export interface DistrictBeds {
  total: number;
  occupied: number;
  reserved: number;
  available: number;
  occupancy_pct: number;
  facilities: FacilityBeds[];
}

export interface FacilityFootfall {
  facility_id: number | null;
  today_patients: number;
  weekly_total: number;
  peak_hour: string | null;
  expected_tomorrow: number;
  calculation: string;
}

export interface DistrictFootfall extends FacilityFootfall {
  facilities: FacilityFootfall[];
}

export interface TestAlternative {
  facility_id: number;
  facility_name: string;
  distance_km: number;
}

export interface TestAlert {
  test_name: string;
  alternative_facility: TestAlternative | null;
  reasoning: string;
}

export interface FacilityTests {
  facility_id: number;
  available_tests: string[];
  unavailable_tests: string[];
  availability_pct: number;
  alerts: TestAlert[];
}

export interface DistrictTests {
  availability_pct: number;
  facilities: FacilityTests[];
}
