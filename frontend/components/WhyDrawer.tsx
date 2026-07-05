"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { AlertExplanation } from "@/lib/types";

interface WhyDrawerProps {
  open: boolean;
  loading: boolean;
  explanation: AlertExplanation | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-panel-border py-3 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="font-mono tabular text-sm text-ink">{value}</span>
    </div>
  );
}

export default function WhyDrawer({
  open,
  loading,
  explanation,
  onClose,
}: WhyDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
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
              <h2 className="text-sm font-semibold tracking-wide text-ink">
                Why this recommendation?
              </h2>
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
              {loading && (
                <p className="py-6 text-sm text-ink-muted">
                  Loading explanation…
                </p>
              )}

              {!loading && explanation && (
                <>
                  <Row
                    label="Current Stock"
                    value={`${explanation.current_stock}`}
                  />
                  <Row
                    label="Avg Daily Consumption"
                    value={`${explanation.avg_daily_consumption}/day`}
                  />
                  <Row
                    label="Days Remaining"
                    value={`${explanation.days_remaining}`}
                  />
                  <Row
                    label="Safety Threshold"
                    value={`${explanation.safety_threshold_days} days`}
                  />
                  {explanation.recommended_source_phc_name && (
                    <Row
                      label="Selected Facility"
                      value={explanation.recommended_source_phc_name}
                    />
                  )}
                  {explanation.distance_km != null && (
                    <Row label="Distance" value={`${explanation.distance_km} km`} />
                  )}

                  {explanation.reasoning && (
                    <div className="mt-4 rounded-lg border border-panel-border bg-base/60 p-3">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">
                        Reason
                      </p>
                      <p className="text-xs leading-relaxed text-ink-muted">
                        {explanation.reasoning}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
