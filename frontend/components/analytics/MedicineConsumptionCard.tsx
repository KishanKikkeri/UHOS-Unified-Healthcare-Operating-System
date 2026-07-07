"use client";

import { Pill } from "lucide-react";
import type { StockAlert, Medicine } from "@/lib/types";

interface MedicineConsumptionCardProps {
  alerts: StockAlert[];
  medicines: Medicine[];
}

/**
 * No endpoint anywhere in the backend exposes a district-wide "consumption
 * per medicine" aggregate (forecast.py's avg_daily_consumption is scoped to
 * one phc+medicine at a time, with no rollup route). Rather than invent a
 * number, this reuses the open Stock Alerts the district already has —
 * grouping the real, already-fetched alert rows by medicine — as the
 * closest real signal of which medicines are under consumption pressure
 * district-wide. See PHASE10A_HANDOVER.md known limitations.
 */
export default function MedicineConsumptionCard({ alerts, medicines }: MedicineConsumptionCardProps) {
  const counts = new Map<number, number>();
  for (const a of alerts) {
    counts.set(a.medicine_id, (counts.get(a.medicine_id) ?? 0) + 1);
  }
  const rows = Array.from(counts.entries())
    .map(([medicineId, count]) => ({
      name: medicines.find((m) => m.id === medicineId)?.name ?? `Medicine #${medicineId}`,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <Pill className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Medicine Consumption Pressure</h3>
      </div>
      <p className="mt-1 text-[11px] text-ink-faint">
        Open stock alerts grouped by medicine — the closest real signal available district-wide.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No open alerts right now.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-xs text-ink-muted">{r.name}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-border">
                <div
                  className="h-full rounded-full bg-accent/60"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right font-mono tabular text-xs text-ink">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
