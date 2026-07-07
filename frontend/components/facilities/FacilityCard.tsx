"use client";

import { Building2, Eye, Wrench, BedDouble, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FacilitySummary,
  FacilityAttendance,
  FacilityBeds,
  FacilityFootfall,
  FacilityTests,
} from "@/lib/types";

/**
 * Display-only banding over the backend's own score — identical pattern to
 * FacilityScoreCard on the District Command Center. No new scoring logic.
 */
function bandOf(score: number): { label: string; tone: "healthy" | "warning" | "critical" } {
  if (score >= 90) return { label: "Excellent", tone: "healthy" };
  if (score >= 70) return { label: "Stable", tone: "warning" };
  return { label: "Needs Attention", tone: "critical" };
}

const TONE_STYLES = {
  healthy: "text-status-healthy",
  warning: "text-status-warning",
  critical: "text-status-critical",
} as const;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono tabular text-sm font-semibold leading-none text-ink">{value}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

export type FacilityDrawerTab = "details" | "services" | "beds" | "doctors";

interface FacilityCardProps {
  facility: FacilitySummary;
  attendance?: FacilityAttendance;
  beds?: FacilityBeds;
  footfall?: FacilityFootfall;
  tests?: FacilityTests;
  onOpen: (facility: FacilitySummary, tab: FacilityDrawerTab) => void;
}

export default function FacilityCard({
  facility,
  attendance,
  beds,
  footfall,
  tests,
  onOpen,
}: FacilityCardProps) {
  const band = bandOf(facility.score);
  const medicineBand = bandOf(facility.medicine_score);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <div>
            <p className="text-sm font-semibold text-ink">{facility.name}</p>
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">
              {facility.type} · {facility.district}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono tabular text-xl font-semibold text-ink">{facility.score}</p>
          <p className={cn("text-[11px] font-medium", TONE_STYLES[band.tone])}>{band.label}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-base/60 p-3 sm:grid-cols-5">
        <MiniStat
          label="Medicine"
          value={`${facility.medicine_score}`}
        />
        <MiniStat
          label="Doctors"
          value={attendance ? `${attendance.present}/${attendance.total}` : "—"}
        />
        <MiniStat
          label="Beds"
          value={beds ? `${beds.occupancy_pct}%` : "—"}
        />
        <MiniStat
          label="Footfall"
          value={footfall ? `${footfall.today_patients}` : "—"}
        />
        <MiniStat
          label="Tests"
          value={tests ? `${tests.availability_pct}%` : "—"}
        />
      </div>

      {medicineBand.tone === "critical" && (
        <p className="text-[11px] text-status-critical">
          Medicine stock needs attention at this facility.
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-panel-border pt-3">
        <button
          type="button"
          onClick={() => onOpen(facility, "details")}
          className="flex items-center gap-1.5 rounded-md border border-panel-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.75} /> View Details
        </button>
        <button
          type="button"
          onClick={() => onOpen(facility, "services")}
          className="flex items-center gap-1.5 rounded-md border border-panel-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Wrench className="h-3.5 w-3.5" strokeWidth={1.75} /> View Services
        </button>
        <button
          type="button"
          onClick={() => onOpen(facility, "beds")}
          className="flex items-center gap-1.5 rounded-md border border-panel-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} /> View Beds
        </button>
        <button
          type="button"
          onClick={() => onOpen(facility, "doctors")}
          className="flex items-center gap-1.5 rounded-md border border-panel-border px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.75} /> View Doctors
        </button>
      </div>
    </div>
  );
}
