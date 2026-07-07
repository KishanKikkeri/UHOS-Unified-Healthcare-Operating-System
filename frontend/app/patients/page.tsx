"use client";

import { useEffect, useState } from "react";
import { Users, MapPin, FileText, Activity, Route } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PatientPicker from "@/components/doctor/PatientPicker";
import HistoryTab from "@/components/citizen/HistoryTab";
import ReferralsTab from "@/components/citizen/ReferralsTab";
import { getPatientHistory, ApiError } from "@/lib/api";
import { latestPrescription } from "@/lib/citizenHistory";
import { useLookups } from "@/lib/useLookups";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Patient, PatientHistory } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";

function PatientsPageContent() {
  const { t } = useLanguage();
  const { facilityName, doctorName } = useLookups();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patient) {
      setHistory(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPatientHistory(patient.id)
      .then(setHistory)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load patient history."))
      .finally(() => setLoading(false));
  }, [patient]);

  const rx = history ? latestPrescription(history) : null;

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("patientsPage.title")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <div className="flex items-center gap-2 text-ink">
              <Users className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("patientsPage.title")}
              </h1>
            </div>

            <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
              <PatientPicker value={patient} onChange={setPatient} />
            </div>

            {!patient && (
              <p className="py-8 text-center text-sm text-ink-faint">
                {t("patientsPage.selectPrompt")}
              </p>
            )}

            {loading && (
              <p className="py-8 text-center text-sm text-ink-muted">{t("common.loading")}</p>
            )}

            {error && (
              <p className="rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
                {error}
              </p>
            )}

            {patient && !loading && !error && history && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
                    <div className="flex items-center gap-2 text-ink-faint">
                      <MapPin className="h-4 w-4 text-accent" strokeWidth={1.75} />
                      <p className="text-[11px] uppercase tracking-wide">Current Facility</p>
                    </div>
                    <p className="mt-2 text-sm text-ink">
                      {patient.phc_home_id != null ? facilityName(patient.phc_home_id) : "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
                    <div className="flex items-center gap-2 text-ink-faint">
                      <FileText className="h-4 w-4 text-accent" strokeWidth={1.75} />
                      <p className="text-[11px] uppercase tracking-wide">Latest Prescription</p>
                    </div>
                    {rx ? (
                      <>
                        <p className="mt-2 text-sm text-ink">
                          {rx.items.length} medicine{rx.items.length === 1 ? "" : "s"} ·{" "}
                          {new Date(rx.date).toLocaleDateString()}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-muted">{doctorName(rx.doctor_id)}</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-ink-faint">No prescriptions on file</p>
                    )}
                  </div>
                </div>

                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    <Route className="h-3.5 w-3.5 text-accent" /> Referral Status &amp; Assigned Bed
                  </h2>
                  <ReferralsTab patient={patient} />
                </section>

                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    <Activity className="h-3.5 w-3.5 text-accent" /> Timeline
                  </h2>
                  <HistoryTab history={history} />
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


export default function PatientsPage() {
  return (
    <AuthGuard allowedRoles={["district_admin", "doctor"]}>
      <PatientsPageContent />
    </AuthGuard>
  );
}
