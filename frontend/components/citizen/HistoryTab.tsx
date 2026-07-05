"use client";

import { motion } from "framer-motion";
import { CalendarDays, FileText, Pill, ArrowRightLeft, type LucideIcon } from "lucide-react";
import type { PatientHistory } from "@/lib/types";
import { buildActivityFeed, type ActivityItem } from "@/lib/citizenHistory";
import { clockTime } from "@/lib/utils";

const KIND_ICON: Record<ActivityItem["kind"], LucideIcon> = {
  appointment: CalendarDays,
  prescription: FileText,
  dispensed: Pill,
};

export default function HistoryTab({ history }: { history: PatientHistory }) {
  const feed = buildActivityFeed(history);

  if (feed.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
        No visits recorded yet — this timeline fills in as appointments,
        prescriptions, and dispensing happen.
      </p>
    );
  }

  return (
    <ol className="relative ml-2 space-y-5 border-l border-panel-border pl-5">
      {feed.map((item, i) => {
        const Icon = KIND_ICON[item.kind];
        const redistributed = item.redistributed === true;
        return (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.02 }}
            className="relative"
          >
            <span className="absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border border-panel-border bg-panel">
              {redistributed ? (
                <ArrowRightLeft className="h-2.5 w-2.5 text-status-warning" strokeWidth={2.5} />
              ) : (
                <Icon className="h-2.5 w-2.5 text-accent" strokeWidth={2.5} />
              )}
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{item.title}</span>
              <span className="font-mono tabular text-xs text-ink-faint">
                {new Date(item.at).toLocaleDateString()} · {clockTime(item.at)}
              </span>
            </div>
            {item.subtitle && (
              <span className="text-xs text-ink-faint">{item.subtitle}</span>
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
