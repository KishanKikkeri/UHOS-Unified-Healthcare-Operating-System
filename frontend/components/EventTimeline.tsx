"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Pill,
  AlertOctagon,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { PulseEvent } from "@/lib/types";
import { clockTime, relativeTime } from "@/lib/utils";

const EVENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  prescription_created: { label: "Prescription Created", icon: FileText },
  medicine_dispensed: { label: "Medicine Dispensed", icon: Pill },
  stock_alert_generated: { label: "Alert Generated", icon: AlertOctagon },
};

function metaFor(eventType: string) {
  return (
    EVENT_META[eventType] ?? {
      label: eventType.replace(/_/g, " "),
      icon: Activity,
    }
  );
}

export default function EventTimeline({ events }: { events: PulseEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-faint">
        No events yet — the timeline fills in as prescriptions are created.
      </p>
    );
  }

  return (
    <ol className="relative ml-2 space-y-4 border-l border-panel-border pl-5">
      {events.map((event, i) => {
        const { label, icon: Icon } = metaFor(event.event_type);
        return (
          <motion.li
            key={event.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i === 0 ? 0 : 0 }}
            className="relative"
          >
            <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-panel-border bg-panel">
              <Icon className="h-2.5 w-2.5 text-accent" strokeWidth={2.5} />
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{label}</span>
              <span className="font-mono tabular text-xs text-ink-faint">
                {clockTime(event.created_at)}
              </span>
            </div>
            <span className="text-xs text-ink-faint">
              {relativeTime(event.created_at)}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
