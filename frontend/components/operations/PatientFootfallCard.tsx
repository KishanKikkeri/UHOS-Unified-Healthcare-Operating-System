"use client";

import { Users } from "lucide-react";
import type { DistrictFootfall } from "@/lib/types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono tabular text-lg font-semibold leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

/** Tiny bar sparkline of per-facility weekly totals — deliberately not a full chart library. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="mt-3 flex h-10 items-end gap-1">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-accent/50"
          style={{ height: `${Math.max((v / max) * 100, 6)}%` }}
          title={`${v}`}
        />
      ))}
    </div>
  );
}

export default function PatientFootfallCard({ data }: { data: DistrictFootfall | null }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Patient Footfall</h3>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatBlock label="Today's Patients" value={data.today_patients} />
            <StatBlock label="Weekly Total" value={data.weekly_total} />
            <StatBlock label="Peak Hour" value={data.peak_hour ?? "—"} />
            <StatBlock label="Expected Tomorrow" value={data.expected_tomorrow} />
          </div>
          <Sparkline values={data.facilities.map((f) => f.weekly_total)} />
        </>
      )}
    </div>
  );
}
