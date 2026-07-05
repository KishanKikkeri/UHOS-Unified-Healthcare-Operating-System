"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockAlert } from "@/lib/types";

interface AlertCardProps {
  alert: StockAlert;
  medicineName: string;
  facilityName: string;
  sourceFacilityName: string | null;
  onWhy: (alertId: number) => void;
}

/**
 * Severity is a display-only banding over the backend's own days_remaining
 * number (already computed by the Forecast Engine) — the frontend adds no
 * new judgment, it just picks a color for a number it was given.
 */
function severityOf(daysRemaining: number): "critical" | "warning" {
  return daysRemaining < 2 ? "critical" : "warning";
}

const SEVERITY_STYLES = {
  critical: {
    border: "border-status-critical/40",
    badgeBg: "bg-status-critical-soft",
    badgeText: "text-status-critical",
    icon: "text-status-critical",
  },
  warning: {
    border: "border-status-warning/40",
    badgeBg: "bg-status-warning-soft",
    badgeText: "text-status-warning",
    icon: "text-status-warning",
  },
} as const;

export default function AlertCard({
  alert,
  medicineName,
  facilityName,
  sourceFacilityName,
  onWhy,
}: AlertCardProps) {
  const severity = severityOf(alert.days_remaining);
  const style = SEVERITY_STYLES[severity];

  const hasTransferPlan =
    alert.recommended_transfer_qty != null && sourceFacilityName != null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-panel p-4 shadow-panel transition-colors",
        style.border
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={cn("mt-0.5 h-4 w-4 shrink-0", style.icon)}
            strokeWidth={2}
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {medicineName} running low
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">{facilityName}</p>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 font-mono tabular text-xs font-semibold",
            style.badgeBg,
            style.badgeText
          )}
        >
          {alert.days_remaining} days left
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-base/60 px-3 py-2 text-xs text-ink-muted">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
        {hasTransferPlan ? (
          <span>
            Transfer{" "}
            <span className="font-mono tabular font-medium text-ink">
              {alert.recommended_transfer_qty?.toFixed(0)}
            </span>{" "}
            units from <span className="text-ink">{sourceFacilityName}</span>
          </span>
        ) : (
          <span>No surplus facility available — district-level shortage</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onWhy(alert.id)}
        className="mt-3 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
      >
        WHY?
      </button>
    </div>
  );
}
