"use client";

import { CalendarClock, FileText, Activity, Files } from "lucide-react";
import type { Patient, PatientHistory, CitizenTab } from "@/lib/types";
import {
  latestPrescription,
  nextAppointment,
  buildActivityFeed,
} from "@/lib/citizenHistory";
import { useLookups } from "@/lib/useLookups";
import { clockTime } from "@/lib/utils";

interface DashboardTabProps {
  patient: Patient;
  history: PatientHistory;
  onNavigate: (tab: CitizenTab) => void;
}

export default function DashboardTab({ patient, history, onNavigate }: DashboardTabProps) {
  const { doctorName, facilityName, doctors } = useLookups();

  const appt = nextAppointment(history);
  const rx = latestPrescription(history);
  const activity = buildActivityFeed(history).slice(0, 5);
  const apptFacility = appt ? facilityName(appt.phc_id) : null;
  const rxFacility = rx
    ? facilityName(doctors.find((d) => d.id === rx.doctor_id)?.phc_id ?? -1)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold text-ink">{patient.name}</h1>
        {patient.dob && <p className="text-xs text-ink-faint">DOB {patient.dob}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
          <div className="flex items-center gap-2 text-ink-faint">
            <CalendarClock className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <p className="text-[11px] uppercase tracking-wide">Next Appointment</p>
          </div>
          {appt ? (
            <>
              <p className="mt-2 text-sm text-ink">
                {new Date(appt.scheduled_at).toLocaleDateString()} ·{" "}
                {clockTime(appt.scheduled_at)}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {doctorName(appt.doctor_id)} · {apptFacility}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">No upcoming appointment</p>
          )}
        </div>

        <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
          <div className="flex items-center gap-2 text-ink-faint">
            <FileText className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <p className="text-[11px] uppercase tracking-wide">Latest Prescription</p>
          </div>
          {rx ? (
            <>
              <p className="mt-2 text-sm text-ink">
                {rx.items.length} medicine{rx.items.length === 1 ? "" : "s"} ·{" "}
                {new Date(rx.date).toLocaleDateString()}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {doctorName(rx.doctor_id)} · {rxFacility}
              </p>
              <button
                type="button"
                onClick={() => onNavigate("prescriptions")}
                className="mt-2 rounded-md border border-panel-border px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
              >
                View details
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-faint">No prescriptions on file</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2 text-ink-faint">
          <Activity className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <p className="text-[11px] uppercase tracking-wide">Recent Activity</p>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-ink-faint">Nothing yet.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {activity.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink">{item.title}</span>
                <span className="font-mono tabular text-xs text-ink-faint">
                  {new Date(item.at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onNavigate("prescriptions")}
          className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <FileText className="h-3.5 w-3.5" /> View Prescriptions
        </button>
        <button
          type="button"
          onClick={() => onNavigate("history")}
          className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Activity className="h-3.5 w-3.5" /> Medical History
        </button>
        <button
          type="button"
          onClick={() => onNavigate("reports")}
          className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Files className="h-3.5 w-3.5" /> Reports
        </button>
      </div>
    </div>
  );
}
