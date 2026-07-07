"use client";

/**
 * Phase 11 — Inventory page.
 *
 * Additive route for the Pharmacist role. Reuses the existing medicines
 * list and stock-alert cards/explanation drawer already built for the
 * District Command Center, rather than introducing a new backend
 * inventory endpoint -- see PHASE11_AUTH_HANDOVER.md's Known Limitations
 * for why this is the district-wide alert feed rather than one filtered
 * to the signed-in pharmacist's own facility.
 */
import { useEffect, useState } from "react";
import { Pill } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import AlertCard from "@/components/AlertCard";
import WhyDrawer from "@/components/WhyDrawer";
import {
  getMedicines,
  getDistrictAlerts,
  getDistrictFacilities,
  getAlertExplanation,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Medicine, StockAlert, FacilitySummary, AlertExplanation } from "@/lib/types";

function InventoryPageContent() {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explanation, setExplanation] = useState<AlertExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    getMedicines().then(setMedicines).catch(() => setMedicines([]));
    getDistrictAlerts().then(setAlerts).catch(() => setAlerts([]));
    getDistrictFacilities().then(setFacilities).catch(() => setFacilities([]));
  }, []);

  const medicineName = (id: number) => medicines.find((m) => m.id === id)?.name ?? `Medicine #${id}`;
  const facilityName = (id: number) => facilities.find((f) => f.phc_id === id)?.name ?? `Facility #${id}`;

  const handleWhy = async (alertId: number) => {
    setDrawerOpen(true);
    setExplanationLoading(true);
    try {
      setExplanation(await getAlertExplanation(alertId));
    } finally {
      setExplanationLoading(false);
    }
  };

  const openAlerts = alerts.filter((a) => a.status === "open");

  return (
    <div className="flex h-screen flex-col bg-base">
      <Topbar district={t("common.district")} live={false} section={t("inventoryPage.title")} showPulse={false} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5">
          <h1 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            {t("inventoryPage.title")}
          </h1>

          <section className="mb-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Open Stock Alerts
            </h2>
            <div className="flex flex-col gap-3">
              {openAlerts.length === 0 && (
                <p className="text-sm text-ink-muted">No open stock alerts.</p>
              )}
              {openAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  medicineName={medicineName(alert.medicine_id)}
                  facilityName={facilityName(alert.phc_id)}
                  sourceFacilityName={
                    alert.recommended_source_phc_id ? facilityName(alert.recommended_source_phc_id) : null
                  }
                  onWhy={handleWhy}
                />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Medicine Catalog
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {medicines.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-panel-border bg-panel px-4 py-3"
                >
                  <Pill className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-ink-faint">Unit: {m.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
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

export default function InventoryPage() {
  return (
    <AuthGuard allowedRoles={["pharmacist"]}>
      <InventoryPageContent />
    </AuthGuard>
  );
}
