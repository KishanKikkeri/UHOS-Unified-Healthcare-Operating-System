"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import FacilityCard, { type FacilityDrawerTab } from "@/components/facilities/FacilityCard";
import FacilityDetailDrawer from "@/components/facilities/FacilityDetailDrawer";
import {
  getDistrictFacilities,
  getDistrictAttendance,
  getDistrictBeds,
  getDistrictFootfall,
  getDistrictTests,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type {
  FacilitySummary,
  DistrictAttendance,
  DistrictBeds,
  DistrictFootfall,
  DistrictTests,
} from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

const POLL_INTERVAL_MS = 8000;

function FacilitiesPageContent() {
  const { t } = useLanguage();
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [attendance, setAttendance] = useState<DistrictAttendance | null>(null);
  const [beds, setBeds] = useState<DistrictBeds | null>(null);
  const [footfall, setFootfall] = useState<DistrictFootfall | null>(null);
  const [tests, setTests] = useState<DistrictTests | null>(null);

  const [selected, setSelected] = useState<FacilitySummary | null>(null);
  const [tab, setTab] = useState<FacilityDrawerTab>("details");

  const refresh = useCallback(async () => {
    try {
      const [f, att, b, ff, tst] = await Promise.all([
        getDistrictFacilities(),
        getDistrictAttendance(),
        getDistrictBeds(),
        getDistrictFootfall(),
        getDistrictTests(),
      ]);
      setFacilities(f);
      setAttendance(att);
      setBeds(b);
      setFootfall(ff);
      setTests(tst);
    } catch {
      // Same resilience pattern as the District Command Center: a failed
      // poll just waits for the next tick rather than crashing the page.
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const handleOpen = (facility: FacilitySummary, nextTab: FacilityDrawerTab) => {
    setSelected(facility);
    setTab(nextTab);
  };

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("facilitiesPage.title")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <div className="flex items-center gap-2 text-ink">
              <Building2 className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("facilitiesPage.title")}
              </h1>
            </div>

            {facilities.length === 0 ? (
              <div className="rounded-xl border border-panel-border bg-panel px-4 py-10 text-center text-sm text-ink-muted">
                {t("common.loading")}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {facilities.map((f) => (
                  <FacilityCard
                    key={f.phc_id}
                    facility={f}
                    attendance={attendance?.facilities.find((a) => a.facility_id === f.phc_id)}
                    beds={beds?.facilities.find((b) => b.facility_id === f.phc_id)}
                    footfall={footfall?.facilities.find((ff) => ff.facility_id === f.phc_id)}
                    tests={tests?.facilities.find((tt) => tt.facility_id === f.phc_id)}
                    onOpen={handleOpen}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <FacilityDetailDrawer
        facility={selected}
        tab={tab}
        onTabChange={setTab}
        onClose={() => setSelected(null)}
        attendance={attendance?.facilities.find((a) => a.facility_id === selected?.phc_id)}
        beds={beds?.facilities.find((b) => b.facility_id === selected?.phc_id)}
        footfall={footfall?.facilities.find((ff) => ff.facility_id === selected?.phc_id)}
        tests={tests?.facilities.find((tt) => tt.facility_id === selected?.phc_id)}
      />
    </div>
  );
}


export default function FacilitiesPage() {
  return (
    <AuthGuard allowedRoles={["district_admin"]}>
      <FacilitiesPageContent />
    </AuthGuard>
  );
}
