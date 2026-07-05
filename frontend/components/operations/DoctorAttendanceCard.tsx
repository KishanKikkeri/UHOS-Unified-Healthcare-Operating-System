"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { clockTime } from "@/lib/utils";
import type { DistrictAttendance } from "@/lib/types";

function StatBlock({ label, value, tone }: { label: string; value: string | number; tone?: "critical" | "healthy" }) {
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "font-mono tabular text-lg font-semibold leading-none",
          tone === "critical" ? "text-status-critical" : tone === "healthy" ? "text-status-healthy" : "text-ink"
        )}
      >
        {value}
      </span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

interface DoctorAttendanceCardProps {
  data: DistrictAttendance | null;
  facilityName?: (facilityId: number) => string;
}

export default function DoctorAttendanceCard({ data, facilityName }: DoctorAttendanceCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-ink">Doctor Attendance</h3>
        </div>
        {data && (
          <span className="text-[11px] uppercase tracking-wide text-ink-faint">
            {data.date}
          </span>
        )}
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatBlock label="Present" value={data.present} tone="healthy" />
            <StatBlock label="Absent" value={data.absent} tone={data.absent > 0 ? "critical" : undefined} />
            <StatBlock label="Attendance %" value={`${data.attendance_pct}%`} />
            <StatBlock label="Today's Total" value={data.total} />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-panel-border py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            {expanded ? "Hide" : "View"} Doctors
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="mt-3 overflow-hidden rounded-lg border border-panel-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-panel-border bg-base/60 text-ink-faint">
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Doctor</th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Facility</th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Status</th>
                    <th className="px-3 py-2 text-left font-medium uppercase tracking-wide">Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.facilities.flatMap((f) =>
                    f.doctors.map((d) => (
                      <tr key={d.doctor_id} className="border-b border-panel-border last:border-b-0">
                        <td className="px-3 py-2 text-ink">{d.doctor_name}</td>
                        <td className="px-3 py-2 text-ink-muted">
                          {facilityName ? facilityName(d.facility_id) : `Facility #${d.facility_id}`}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "font-medium",
                              d.status === "present" ? "text-status-healthy" : "text-status-critical"
                            )}
                          >
                            {d.status === "present" ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono tabular text-ink-muted">
                          {d.check_in_time ? clockTime(d.check_in_time) : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
