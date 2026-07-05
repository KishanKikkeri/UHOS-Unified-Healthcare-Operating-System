"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, FileText, Activity, Files, HeartPulse } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import PatientPicker from "@/components/doctor/PatientPicker";
import DashboardTab from "@/components/citizen/DashboardTab";
import PrescriptionsTab from "@/components/citizen/PrescriptionsTab";
import HistoryTab from "@/components/citizen/HistoryTab";
import ReportsTab from "@/components/citizen/ReportsTab";
import { getPatientHistory, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Patient, PatientHistory, CitizenTab } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function CitizenAppPage() {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<CitizenTab>("dashboard");

  const TABS: { key: CitizenTab; label: string; icon: typeof LayoutGrid }[] = [
    { key: "dashboard", label: t("citizenApp.tabs.dashboard"), icon: LayoutGrid },
    { key: "prescriptions", label: t("citizenApp.tabs.prescriptions"), icon: FileText },
    { key: "history", label: t("citizenApp.tabs.history"), icon: Activity },
    { key: "reports", label: t("citizenApp.tabs.reports"), icon: Files },
  ];

  useEffect(() => {
    if (!patient) {
      setHistory(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPatientHistory(patient.id)
      .then(setHistory)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : t("citizenApp.errorFallback"))
      )
      .finally(() => setLoading(false));
  }, [patient, t]);

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("citizenApp.title")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-2xl flex-col gap-5">
            <div className="flex items-center gap-2 text-ink">
              <HeartPulse className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("citizenApp.title")}
              </h1>
            </div>

            <div className="rounded-xl border border-panel-border bg-panel p-4 shadow-panel">
              <PatientPicker value={patient} onChange={setPatient} />
            </div>

            {!patient && (
              <p className="py-8 text-center text-sm text-ink-faint">
                {t("citizenApp.selectPatientPrompt")}
              </p>
            )}

            {patient && (
              <>
                <nav className="flex gap-1 border-b border-panel-border">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={cn(
                        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                        tab === key
                          ? "border-accent text-ink"
                          : "border-transparent text-ink-muted hover:text-ink"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {label}
                    </button>
                  ))}
                </nav>

                {loading && (
                  <p className="py-8 text-center text-sm text-ink-muted">
                    {t("citizenApp.loadingHistory")}
                  </p>
                )}

                {error && (
                  <p className="rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
                    {error}
                  </p>
                )}

                {!loading && !error && history && (
                  <>
                    {tab === "dashboard" && (
                      <DashboardTab patient={patient} history={history} onNavigate={setTab} />
                    )}
                    {tab === "prescriptions" && <PrescriptionsTab history={history} />}
                    {tab === "history" && <HistoryTab history={history} />}
                    {tab === "reports" && <ReportsTab />}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
