"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AlertCard from "@/components/AlertCard";
import WhyDrawer from "@/components/WhyDrawer";
import {
  getDistrictAlerts,
  getDistrictFacilities,
  getMedicines,
  getAlertExplanation,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { StockAlert, FacilitySummary, Medicine, AlertExplanation } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

const POLL_INTERVAL_MS = 8000;

type Severity = "critical" | "warning" | "information";

/**
 * Display-only banding over the backend's own days_remaining number — same
 * rule as AlertCard's internal severityOf, just with a third "information"
 * band for the Alerts page's grouping requirement. No new judgment on top
 * of what the Forecast Engine already computed.
 */
function severityOf(daysRemaining: number): Severity {
  if (daysRemaining < 2) return "critical";
  if (daysRemaining < 5) return "warning";
  return "information";
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  information: "Information",
};

function AlertsPageContent() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explanation, setExplanation] = useState<AlertExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [a, f, m] = await Promise.all([
        getDistrictAlerts(),
        getDistrictFacilities(),
        getMedicines(),
      ]);
      setAlerts(a);
      setFacilities(f);
      setMedicines(m);
    } catch {
      // Same resilience pattern as the District Command Center.
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const facilityName = (phcId: number) =>
    facilities.find((f) => f.phc_id === phcId)?.name ?? `Facility #${phcId}`;
  const medicineName = (medicineId: number) =>
    medicines.find((m) => m.id === medicineId)?.name ?? `Medicine #${medicineId}`;

  const handleWhy = async (alertId: number) => {
    setDrawerOpen(true);
    setExplanationLoading(true);
    try {
      const data = await getAlertExplanation(alertId);
      setExplanation(data);
    } catch {
      setExplanation(null);
    } finally {
      setExplanationLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (facilityFilter !== "all" && String(a.phc_id) !== facilityFilter) return false;
      if (severityFilter !== "all" && severityOf(a.days_remaining) !== severityFilter) return false;
      // The /district/alerts endpoint only ever returns status="open" rows
      // (see routes_dashboard.py), so this filter is a no-op beyond "all"
      // and "open" today — see PHASE10A_HANDOVER.md known limitations.
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (dateFilter && a.created_at.slice(0, 10) !== dateFilter) return false;
      return true;
    });
  }, [alerts, facilityFilter, severityFilter, statusFilter, dateFilter]);

  const groups: Severity[] = ["critical", "warning", "information"];

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("alertsPage.title")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div className="flex items-center gap-2 text-ink">
              <AlertTriangle className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("alertsPage.title")}
              </h1>
            </div>

            <div className="flex flex-wrap gap-3 rounded-xl border border-panel-border bg-panel p-3">
              <select
                value={facilityFilter}
                onChange={(e) => setFacilityFilter(e.target.value)}
                className="rounded-md border border-panel-border bg-transparent px-2.5 py-1.5 text-xs text-ink-muted outline-none hover:border-accent/50"
              >
                <option value="all">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f.phc_id} value={f.phc_id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-md border border-panel-border bg-transparent px-2.5 py-1.5 text-xs text-ink-muted outline-none hover:border-accent/50"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="information">Information</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-panel-border bg-transparent px-2.5 py-1.5 text-xs text-ink-muted outline-none hover:border-accent/50"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-md border border-panel-border bg-transparent px-2.5 py-1.5 text-xs text-ink-muted outline-none hover:border-accent/50"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-panel-border bg-panel px-4 py-10 text-center text-sm text-ink-muted">
                {t("dashboard.noOpenAlerts")}
              </div>
            ) : (
              groups.map((severity) => {
                const bucket = filtered.filter((a) => severityOf(a.days_remaining) === severity);
                if (bucket.length === 0) return null;
                return (
                  <section key={severity}>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {SEVERITY_LABEL[severity]} ({bucket.length})
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {bucket.map((alert) => (
                        <AlertCard
                          key={alert.id}
                          alert={alert}
                          medicineName={medicineName(alert.medicine_id)}
                          facilityName={facilityName(alert.phc_id)}
                          sourceFacilityName={
                            alert.recommended_source_phc_id != null
                              ? facilityName(alert.recommended_source_phc_id)
                              : null
                          }
                          timestamp={alert.created_at}
                          onWhy={handleWhy}
                        />
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </main>
      </div>

      <WhyDrawer
        open={drawerOpen}
        loading={explanationLoading}
        explanation={explanation}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}


export default function AlertsPage() {
  return (
    <AuthGuard allowedRoles={["district_admin"]}>
      <AlertsPageContent />
    </AuthGuard>
  );
}
