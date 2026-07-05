import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "critical" | "warning" | "healthy";
}

const TONE_TEXT: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-ink",
  critical: "text-status-critical",
  warning: "text-status-warning",
  healthy: "text-status-healthy",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: StatCardProps) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-panel-border bg-panel px-4 py-3 shadow-panel">
      <Icon className={cn("h-4 w-4", TONE_TEXT[tone])} strokeWidth={1.75} />
      <div className="flex flex-col">
        <span className="font-mono tabular text-lg font-semibold leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </div>
    </div>
  );
}
