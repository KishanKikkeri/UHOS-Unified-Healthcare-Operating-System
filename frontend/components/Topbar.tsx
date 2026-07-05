"use client";

import { CircleUser } from "lucide-react";
import PulseStatus from "./PulseStatus";

interface TopbarProps {
  district: string;
  live: boolean;
  section?: string;
  showPulse?: boolean;
}

export default function Topbar({
  district,
  live,
  section = "District Command Center",
  showPulse = true,
}: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-panel-border bg-base/95 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-display text-sm font-bold tracking-[0.2em] text-ink">
          UHOS
        </span>
        <span className="h-4 w-px bg-panel-border" aria-hidden />
        <span className="text-sm text-ink-muted">{section}</span>
      </div>

      <div className="flex items-center gap-5">
        {showPulse && <PulseStatus live={live} />}
        <span className="h-4 w-px bg-panel-border" aria-hidden />
        <span className="text-xs font-medium text-ink-muted">{district}</span>
        <CircleUser className="h-5 w-5 text-ink-faint" strokeWidth={1.5} />
      </div>
    </header>
  );
}
