"use client";

import { Route } from "lucide-react";
import type { DistrictReferralAnalytics } from "@/lib/types";

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono tabular text-lg font-semibold leading-none text-ink">{value}</span>
      <span className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">{label}</span>
    </div>
  );
}

export default function ReferralAnalyticsCard({ data }: { data: DistrictReferralAnalytics | null }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <Route className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-ink">Today&apos;s Referrals</h3>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatBlock label="Successful" value={data.today_successful} />
            <StatBlock label="Pending" value={data.today_pending} />
            <StatBlock label="Emergency" value={data.today_emergency} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Top requested service:{" "}
            <span className="font-medium text-ink">{data.top_requested_service ?? "—"}</span>
          </p>
        </>
      )}
    </div>
  );
}
