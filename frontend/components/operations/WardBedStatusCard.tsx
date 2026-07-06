"use client";

import { BedSingle } from "lucide-react";
import type { DistrictWardSummary } from "@/lib/types";

function WardBar({ ward }: { ward: { ward: string; total: number; available: number; occupied: number; reserved: number } }) {
  const occupiedPct = ward.total ? (ward.occupied / ward.total) * 100 : 0;
  const reservedPct = ward.total ? (ward.reserved / ward.total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted">{ward.ward}</span>
        <span className="font-mono tabular text-ink">
          {ward.occupied + ward.reserved}/{ward.total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-border">
        <div className="flex h-full">
          <div className="h-full bg-status-critical" style={{ width: `${occupiedPct}%` }} />
          <div className="h-full bg-status-warning" style={{ width: `${reservedPct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function WardBedStatusCard({
  data,
  facilityName,
}: {
  data: DistrictWardSummary | null;
  facilityName?: (facilityId: number) => string;
}) {
  const facilitiesWithWards = Array.isArray(data?.facilities)
    ? data.facilities.filter((f) => f.wards.length > 0)
    : [];

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <BedSingle className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Ward-wise Bed Status</h3>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : facilitiesWithWards.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No individually tracked beds yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {facilitiesWithWards.map((f) => (
            <div key={f.facility_id} className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wide text-ink-faint">
                {facilityName ? facilityName(f.facility_id) : `Facility #${f.facility_id}`}
              </span>
              <div className="flex flex-col gap-2">
                {f.wards.map((ward) => (
                  <WardBar key={ward.ward} ward={ward} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
