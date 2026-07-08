"use client";

import { Sparkles } from "lucide-react";
import { DEMO_MODE } from "@/lib/demoMode";

/**
 * Phase 12 — Demo Mode. Purely a transparency indicator for judges/users
 * -- rendered only when NEXT_PUBLIC_DEMO_MODE=true. Doesn't affect
 * layout when off (renders nothing), so every page that includes it is
 * pixel-identical to Phase 11 in a real deployment.
 */
export default function DemoModeBadge({ floating = false }: { floating?: boolean }) {
  if (!DEMO_MODE) return null;

  return (
    <div
      className={
        floating
          ? "fixed right-4 top-4 z-50 flex flex-col items-end gap-0.5"
          : "flex flex-col items-end gap-0.5"
      }
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        Demo Mode Enabled
      </span>
      <span className="text-[10px] text-ink-faint">Authentication bypassed for judging.</span>
    </div>
  );
}
