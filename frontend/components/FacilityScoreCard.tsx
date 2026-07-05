import { cn } from "@/lib/utils";
import type { FacilitySummary } from "@/lib/types";

/**
 * Display-only banding over the backend's own score — same pattern as
 * AlertCard's severity color. No new scoring logic is introduced.
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

export default function FacilityScoreCard({ facility }: { facility: FacilitySummary }) {
  const band = bandOf(facility.score);

  return (
    <div className="flex items-center justify-between rounded-lg border border-panel-border bg-panel px-4 py-3">
      <div>
        <p className="text-sm font-medium text-ink">{facility.name}</p>
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">
          {facility.type} · {facility.district}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono tabular text-xl font-semibold text-ink">
          {facility.score}
        </p>
        <p className={cn("text-[11px] font-medium", TONE_STYLES[band.tone])}>
          {band.label}
        </p>
      </div>
    </div>
  );
}
