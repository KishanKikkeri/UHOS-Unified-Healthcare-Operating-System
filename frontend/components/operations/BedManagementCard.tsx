"use client";

import { BedDouble, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DistrictBeds } from "@/lib/types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono tabular text-lg font-semibold leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

export default function BedManagementCard({
  data,
  facilityName,
}: {
  data: DistrictBeds | null;
  facilityName?: (facilityId: number) => string;
}) {
  const alertFacilities = data?.facilities.filter((f) => f.is_alert) ?? [];

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <BedDouble className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Beds</h3>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBlock label="Occupied" value={data.occupied} />
            <StatBlock label="Available" value={data.available} />
            <StatBlock label="Occupancy %" value={`${data.occupancy_pct}%`} />
          </div>

          {alertFacilities.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {alertFacilities.map((f) => (
                <div
                  key={f.facility_id}
                  className="flex items-center gap-2 rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span>
                    {facilityName ? facilityName(f.facility_id) : `Facility #${f.facility_id}`} is at{" "}
                    <span className={cn("font-mono tabular font-semibold")}>{f.occupancy_pct}%</span>{" "}
                    occupancy
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
