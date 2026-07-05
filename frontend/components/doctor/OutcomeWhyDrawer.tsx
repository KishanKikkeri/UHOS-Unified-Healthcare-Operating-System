"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ItemOutcome } from "@/lib/types";

interface OutcomeWhyDrawerProps {
  outcome: ItemOutcome | null;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  current_stock: "Current Stock",
  avg_daily_consumption: "Avg Daily Consumption",
  days_remaining: "Days Remaining",
  safety_threshold: "Safety Threshold",
  selected_source: "Selected Facility Rule",
  distance_km: "Distance",
};

function formatLabel(key: string): string {
  return (
    LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "distance_km") return `${value} km`;
  if (key === "avg_daily_consumption") return `${value}/day`;
  if (key === "safety_threshold" || key === "days_remaining")
    return `${value} days`;
  return String(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-panel-border py-3 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="text-right font-mono tabular text-sm text-ink">
        {value}
      </span>
    </div>
  );
}

export default function OutcomeWhyDrawer({
  outcome,
  onClose,
}: OutcomeWhyDrawerProps) {
  const open = outcome != null;
  // "reason" reads better as prose below the numbers than as a
  // right-aligned value like the rest of the fields.
  const entries = outcome
    ? Object.entries(outcome.explanation).filter(([k]) => k !== "reason")
    : [];
  const reason = outcome?.explanation.reason;

  return (
    <AnimatePresence>
      {open && outcome && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-panel-border bg-panel shadow-drawer"
          >
            <div className="h-0.5 w-full readout-hairline" />
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-ink">
                  Why this recommendation?
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {outcome.medicine_name}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-ink-faint transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-6">
              {entries.map(([key, value]) => (
                <Row
                  key={key}
                  label={formatLabel(key)}
                  value={formatValue(key, value)}
                />
              ))}

              {typeof reason === "string" && (
                <div className="mt-4 rounded-lg border border-panel-border bg-base/60 p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">
                    Reason
                  </p>
                  <p className="text-xs leading-relaxed text-ink-muted">
                    {reason}
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
