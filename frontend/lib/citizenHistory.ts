import type {
  PatientHistory,
  HistoryPrescription,
  HistoryPrescriptionItem,
  HistoryAppointment,
} from "./types";

/**
 * Everything in this file is display-layer reshaping only — sorting,
 * filtering, and summing fields the backend already returned. No stock,
 * forecast, or redistribution decision is made here (per handover's
 * "Frontend performs ZERO medical calculations" rule); this only answers
 * "what did already happen", never "what should happen".
 */

export function latestPrescription(
  history: PatientHistory
): HistoryPrescription | null {
  if (history.prescriptions.length === 0) return null;
  return [...history.prescriptions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

export function nextAppointment(
  history: PatientHistory
): HistoryAppointment | null {
  const now = Date.now();
  const upcoming = history.appointments
    .filter(
      (a) => a.status === "booked" && new Date(a.scheduled_at).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  return upcoming[0] ?? null;
}

export type DispenseStatus = "fully_dispensed" | "partially_dispensed" | "not_dispensed";

export function itemDispenseStatus(item: HistoryPrescriptionItem): DispenseStatus {
  const dispensed = item.dispensing_events.reduce((sum, e) => sum + e.quantity, 0);
  if (dispensed <= 0) return "not_dispensed";
  if (dispensed >= item.quantity_prescribed) return "fully_dispensed";
  return "partially_dispensed";
}

export function prescriptionDispenseStatus(rx: HistoryPrescription): DispenseStatus {
  const statuses = rx.items.map(itemDispenseStatus);
  if (statuses.every((s) => s === "fully_dispensed")) return "fully_dispensed";
  if (statuses.every((s) => s === "not_dispensed")) return "not_dispensed";
  return "partially_dispensed";
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "appointment" | "prescription" | "dispensed";
  title: string;
  subtitle?: string;
  redistributed?: boolean;
}

/** Newest-first feed combining appointments, prescriptions, and dispensing events. */
export function buildActivityFeed(history: PatientHistory): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const appt of history.appointments) {
    items.push({
      id: `appt-${appt.id}`,
      at: appt.scheduled_at,
      kind: "appointment",
      title: "Appointment",
      subtitle: appt.status,
    });
  }

  for (const rx of history.prescriptions) {
    items.push({
      id: `rx-${rx.prescription_id}`,
      at: rx.date,
      kind: "prescription",
      title: "Prescription Created",
      subtitle: `${rx.items.length} medicine${rx.items.length === 1 ? "" : "s"}`,
    });

    for (const item of rx.items) {
      for (const [i, event] of item.dispensing_events.entries()) {
        items.push({
          id: `disp-${rx.prescription_id}-${item.medicine}-${i}`,
          at: event.timestamp,
          kind: "dispensed",
          title: `${item.medicine} Dispensed`,
          subtitle: event.was_redistributed
            ? `${event.quantity} units · redistributed`
            : `${event.quantity} units`,
          redistributed: event.was_redistributed,
        });
      }
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
