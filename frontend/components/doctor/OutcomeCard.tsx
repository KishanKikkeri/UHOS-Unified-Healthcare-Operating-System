"use client";

import {
  CheckCircle2,
  ArrowRightLeft,
  AlertOctagon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemOutcome, OutcomeStatus } from "@/lib/types";

const STATUS_META: Record<
  OutcomeStatus,
  {
    label: string;
    icon: LucideIcon;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  dispensed_locally: {
    label: "Dispensed Locally",
    icon: CheckCircle2,
    border: "border-status-healthy/40",
    badgeBg: "bg-status-healthy-soft",
    badgeText: "text-status-healthy",
  },
  dispensed_via_redistribution: {
    label: "Redistribution Recommended",
    icon: ArrowRightLeft,
    border: "border-status-warning/40",
    badgeBg: "bg-status-warning-soft",
    badgeText: "text-status-warning",
  },
  critical_shortage: {
    label: "Emergency Procurement Required",
    icon: AlertOctagon,
    border: "border-status-critical/40",
    badgeBg: "bg-status-critical-soft",
    badgeText: "text-status-critical",
  },
};

interface OutcomeCardProps {
  outcome: ItemOutcome;
  onWhy: (outcome: ItemOutcome) => void;
}

/**
 * Display-only summary sentence built from fields the backend already
 * returned in `recommendation` — no new decisions, same rule as the
 * District Command Center's AlertCard.
 */
function summaryLine(outcome: ItemOutcome): string {
  const rec = outcome.recommendation;
  if (outcome.status === "dispensed_locally") {
    return `${outcome.requested_qty} units dispensed from current stock.`;
  }
  if (outcome.status === "dispensed_via_redistribution") {
    const source =
      typeof rec.source_facility === "string"
        ? rec.source_facility
        : "a nearby facility";
    const qty =
      typeof rec.transfer_quantity === "number"
        ? rec.transfer_quantity
        : outcome.requested_qty;
    return `Transfer ${qty} units from ${source}.`;
  }
  return "No facility in the district currently has sufficient surplus.";
}

export default function OutcomeCard({ outcome, onWhy }: OutcomeCardProps) {
  const meta = STATUS_META[outcome.status] ?? STATUS_META.critical_shortage;
  const Icon = meta.icon;

  return (
    <div className={cn("rounded-xl border bg-panel p-4 shadow-panel", meta.border)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon
            className={cn("mt-0.5 h-4 w-4 shrink-0", meta.badgeText)}
            strokeWidth={2}
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {outcome.medicine_name} · {outcome.requested_qty} requested
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {summaryLine(outcome)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
            meta.badgeBg,
            meta.badgeText
          )}
        >
          {meta.label}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onWhy(outcome)}
        className="mt-3 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
      >
        WHY?
      </button>
    </div>
  );
}
