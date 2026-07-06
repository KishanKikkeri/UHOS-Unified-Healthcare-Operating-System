"use client";

import { useEffect, useState } from "react";
import { Route, MapPin, BedDouble, CalendarClock } from "lucide-react";
import { getPatientReferrals, ApiError } from "@/lib/api";
import type { Patient, PatientReferral } from "@/lib/types";

function StatusBadge({ status }: { status: PatientReferral["status"] }) {
  const styles: Record<string, string> = {
    pending: "border-status-warning/40 bg-status-warning-soft text-status-warning",
    confirmed: "border-status-healthy/40 bg-status-healthy-soft text-status-healthy",
    completed: "border-accent/40 bg-accent-soft text-accent",
    cancelled: "border-panel-border bg-panel text-ink-faint",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

export default function ReferralsTab({ patient }: { patient: Patient }) {
  const [referrals, setReferrals] = useState<PatientReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getPatientReferrals(patient.id)
      .then(setReferrals)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load referrals."))
      .finally(() => setLoading(false));
  }, [patient.id]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-ink-muted">Loading referrals…</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
        {error}
      </p>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border py-14 text-center">
        <Route className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
        <p className="text-sm text-ink-muted">No referrals yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {referrals.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">
              {r.destination_facility_name ?? "No facility found yet"}
            </span>
            <StatusBadge status={r.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span>Service: <span className="text-ink">{r.service_name}</span></span>
            {r.distance_km != null && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" strokeWidth={2} /> {r.distance_km} km
              </span>
            )}
            {r.assigned_bed_number && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3" strokeWidth={2} /> Bed {r.assigned_bed_number} Reserved
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" strokeWidth={2} />
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>

          {r.reasoning && <p className="text-xs text-ink-faint">{r.reasoning}</p>}
        </div>
      ))}
    </div>
  );
}
