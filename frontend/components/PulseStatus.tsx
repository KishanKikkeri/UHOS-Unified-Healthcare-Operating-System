"use client";

import { cn } from "@/lib/utils";

interface PulseStatusProps {
  live: boolean;
  className?: string;
}

/**
 * The dot beats twice then rests — a heartbeat, not a generic blinking
 * "online" indicator. This is the one piece of ambient motion on the page;
 * everything else stays still so this reads as meaningful.
 */
export default function PulseStatus({ live, className }: PulseStatusProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        {live && (
          <span
            className="absolute inline-flex h-full w-full rounded-full bg-accent animate-ring-out"
            aria-hidden
          />
        )}
        <span
          className={cn(
            "relative inline-flex h-2.5 w-2.5 rounded-full",
            live ? "bg-accent animate-pulse-beat" : "bg-ink-faint"
          )}
        />
      </span>
      <span className="text-xs font-medium tracking-wide text-ink-muted">
        Pulse AI
      </span>
      <span
        className={cn(
          "text-xs font-semibold tracking-widest",
          live ? "text-accent" : "text-ink-faint"
        )}
      >
        {live ? "● LIVE" : "OFFLINE"}
      </span>
    </div>
  );
}
