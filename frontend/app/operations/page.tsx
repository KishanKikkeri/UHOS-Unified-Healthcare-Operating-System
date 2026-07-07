"use client";

/**
 * Phase 11 — Operations page.
 *
 * Additive route named directly in the handover doc's RBAC table
 * ("Operations: Facility Admin, Doctor, Lab Technician"). Rather than
 * inventing new backend endpoints, this reuses the exact same Phase 5
 * operations cards and district-wide endpoints already wired into the
 * District Command Center dashboard -- see PHASE11_AUTH_HANDOVER.md's
 * "Known Limitations" for why this is district-wide rather than
 * filtered to the signed-in user's own facility.
 */
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DoctorAttendanceCard from "@/components/operations/DoctorAttendanceCard";
import BedManagementCard from "@/components/operations/BedManagementCard";
import PatientFootfallCard from "@/components/operations/PatientFootfallCard";
import TestAvailabilityCard from "@/components/operations/TestAvailabilityCard";
import WardBedStatusCard from "@/components/operations/WardBedStatusCard";
import {
  getDistrictFacilities,
  getDistrictAttendance,
  getDistrictBeds,
  getDistrictFootfall,
  getDistrictTests,
  getDistrictWards,
} from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type {
  FacilitySummary,
  DistrictAttendance,
  DistrictBeds,
  DistrictFootfall,
  DistrictTests,
  DistrictWardSummary,
} from "@/lib/types";

function OperationsPageContent() {
  const { t } = useLanguage();
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [attendance, setAttendance] = useState<DistrictAttendance | null>(null);
  const [beds, setBeds] = useState<DistrictBeds | null>(null);
  const [footfall, setFootfall] = useState<DistrictFootfall | null>(null);
  const [tests, setTests] = useState<DistrictTests | null>(null);
  const [wards, setWards] = useState<DistrictWardSummary | null>(null);

  useEffect(() => {
    getDistrictFacilities().then(setFacilities).catch(() => setFacilities([]));
    getDistrictAttendance().then(setAttendance).catch(() => setAttendance(null));
    getDistrictBeds().then(setBeds).catch(() => setBeds(null));
    getDistrictFootfall().then(setFootfall).catch(() => setFootfall(null));
    getDistrictTests().then(setTests).catch(() => setTests(null));
    getDistrictWards().then(setWards).catch(() => setWards(null));
  }, []);

  const facilityName = (phcId: number) =>
    facilities.find((f) => f.phc_id === phcId)?.name ?? `Facility #${phcId}`;

  return (
    <div className="flex h-screen flex-col bg-base">
      <Topbar district={t("common.district")} live={false} section={t("operationsPage.title")} showPulse={false} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5">
          <h1 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            {t("operationsPage.title")}
          </h1>
          <div className="grid gap-3 sm:grid-cols-2">
            <DoctorAttendanceCard data={attendance} facilityName={facilityName} />
            <BedManagementCard data={beds} facilityName={facilityName} />
            <PatientFootfallCard data={footfall} />
            <TestAvailabilityCard data={tests} facilityName={facilityName} />
            <WardBedStatusCard data={wards} facilityName={facilityName} />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <AuthGuard allowedRoles={["facility_admin", "doctor", "lab_technician"]}>
      <OperationsPageContent />
    </AuthGuard>
  );
}
