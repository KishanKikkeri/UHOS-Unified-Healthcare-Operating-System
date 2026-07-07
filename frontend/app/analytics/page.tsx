"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import FacilityScoreCard from "@/components/FacilityScoreCard";
import DoctorAttendanceCard from "@/components/operations/DoctorAttendanceCard";
import BedManagementCard from "@/components/operations/BedManagementCard";
import PatientFootfallCard from "@/components/operations/PatientFootfallCard";
import ReferralAnalyticsCard from "@/components/operations/ReferralAnalyticsCard";
import MedicineConsumptionCard from "@/components/analytics/MedicineConsumptionCard";
import {
  getDistrictFacilities,
  getDistrictAlerts,
  getMedicines,
  getDistrictAttendance,
  getDistrictBeds,
  getDistrictFootfall,
  getDistrictReferralAnalytics,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type {
  FacilitySummary,
  StockAlert,
  Medicine,
  DistrictAttendance,
  DistrictBeds,
  DistrictFootfall,
  DistrictReferralAnalytics,
} from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

const POLL_INTERVAL_MS = 8000;

function AnalyticsPageContent() {
  const { t } = useLanguage();
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [attendance, setAttendance] = useState<DistrictAttendance | null>(null);
  const [beds, setBeds] = useState<DistrictBeds | null>(null);
  const [footfall, setFootfall] = useState<DistrictFootfall | null>(null);
  const [referralAnalytics, setReferralAnalytics] = useState<DistrictReferralAnalytics | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [f, a, m, att, b, ff, ra] = await Promise.all([
        getDistrictFacilities(),
        getDistrictAlerts(),
        getMedicines(),
        getDistrictAttendance(),
        getDistrictBeds(),
        getDistrictFootfall(),
        getDistrictReferralAnalytics(),
      ]);
      setFacilities(f);
      setAlerts(a);
      setMedicines(m);
      setAttendance(att);
      setBeds(b);
      setFootfall(ff);
      setReferralAnalytics(ra);
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

  const ranked = [...facilities].sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("analyticsPage.title")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div className="flex items-center gap-2 text-ink">
              <BarChart3 className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("analyticsPage.title")}
              </h1>
            </div>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Facility Rankings
              </h2>
              {ranked.length === 0 ? (
                <div className="rounded-xl border border-panel-border bg-panel px-4 py-6 text-center text-sm text-ink-muted">
                  {t("common.loading")}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {ranked.map((f, i) => (
                    <div key={f.phc_id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-right font-mono tabular text-xs text-ink-faint">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <FacilityScoreCard facility={f} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <ReferralAnalyticsCard data={referralAnalytics} />
              <MedicineConsumptionCard alerts={alerts} medicines={medicines} />
              <BedManagementCard data={beds} facilityName={facilityName} />
              <PatientFootfallCard data={footfall} />
              <DoctorAttendanceCard data={attendance} facilityName={facilityName} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}


export default function AnalyticsPage() {
  return (
    <AuthGuard allowedRoles={["district_admin"]}>
      <AnalyticsPageContent />
    </AuthGuard>
  );
}
