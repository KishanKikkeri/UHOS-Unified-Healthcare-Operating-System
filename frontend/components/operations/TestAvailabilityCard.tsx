"use client";

import { FlaskConical, AlertTriangle } from "lucide-react";
import type { DistrictTests } from "@/lib/types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono tabular text-lg font-semibold leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

export default function TestAvailabilityCard({
  data,
  facilityName,
}: {
  data: DistrictTests | null;
  facilityName?: (facilityId: number) => string;
}) {
  const availableCount = data?.facilities.reduce((sum, f) => sum + f.available_tests.length, 0) ?? 0;
  const unavailableCount = data?.facilities.reduce((sum, f) => sum + f.unavailable_tests.length, 0) ?? 0;

  const allAlerts =
    data?.facilities.flatMap((f) => f.alerts.map((a) => ({ ...a, facility_id: f.facility_id }))) ?? [];

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Test Availability</h3>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBlock label="Available Tests" value={availableCount} />
            <StatBlock label="Unavailable Tests" value={unavailableCount} />
            <StatBlock label="Availability %" value={`${data.availability_pct}%`} />
          </div>

          {allAlerts.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {allAlerts.map((a, i) => (
                <div
                  key={`${a.facility_id}-${a.test_name}-${i}`}
                  className="flex items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning-soft px-3 py-2 text-xs text-status-warning"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span>
                    <span className="font-medium">{a.test_name}</span> unavailable at{" "}
                    {facilityName ? facilityName(a.facility_id) : `Facility #${a.facility_id}`} —{" "}
                    {a.alternative_facility
                      ? `try ${a.alternative_facility.facility_name} (${a.alternative_facility.distance_km} km)`
                      : "no nearby alternative"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
