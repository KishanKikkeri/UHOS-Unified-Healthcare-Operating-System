import { cn } from "@/lib/utils";
import type { DispenseStatus } from "@/lib/citizenHistory";

const META: Record<DispenseStatus, { label: string; bg: string; text: string }> = {
  fully_dispensed: {
    label: "Fully Dispensed",
    bg: "bg-status-healthy-soft",
    text: "text-status-healthy",
  },
  partially_dispensed: {
    label: "Partially Dispensed",
    bg: "bg-status-warning-soft",
    text: "text-status-warning",
  },
  not_dispensed: {
    label: "Not Yet Dispensed",
    bg: "bg-status-critical-soft",
    text: "text-status-critical",
  },
};

export default function DispenseStatusBadge({ status }: { status: DispenseStatus }) {
  const meta = META[status];
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.bg,
        meta.text
      )}
    >
      {meta.label}
    </span>
  );
}
