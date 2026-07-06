"use client";

import { useState } from "react";
import { Stethoscope, Send } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import DoctorPicker from "@/components/doctor/DoctorPicker";
import PatientPicker from "@/components/doctor/PatientPicker";
import PrescriptionItemsForm, {
  newDraftItem,
  type DraftItem,
} from "@/components/doctor/PrescriptionItemsForm";
import OutcomeCard from "@/components/doctor/OutcomeCard";
import OutcomeWhyDrawer from "@/components/doctor/OutcomeWhyDrawer";
import ReferralPanel from "@/components/doctor/ReferralPanel";
import { createPrescription, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Doctor, Patient, PrescriptionResult, ItemOutcome } from "@/lib/types";

export default function DoctorWorkspacePage() {
  const { t } = useLanguage();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionResult | null>(null);
  const [whyOutcome, setWhyOutcome] = useState<ItemOutcome | null>(null);

  const validItems = items.filter(
    (it) => it.medicine_id !== "" && Number(it.quantity) > 0
  );
  const canSubmit =
    doctor != null && patient != null && validItems.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!doctor || !patient || validItems.length === 0) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await createPrescription({
        patient_id: patient.id,
        doctor_id: doctor.id,
        items: validItems.map((it) => ({
          medicine_id: Number(it.medicine_id),
          quantity: Number(it.quantity),
        })),
      });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("doctorWorkspace.errorFallback")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startNewPrescription = () => {
    setResult(null);
    setPatient(null);
    setItems([newDraftItem()]);
    setError(null);
  };

  return (
    <div className="flex h-screen flex-col">
      <Topbar
        district={t("common.district")}
        live={false}
        section={t("nav.doctorWorkspace")}
        showPulse={false}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div className="flex items-center gap-2 text-ink">
              <Stethoscope className="h-5 w-5 text-accent" strokeWidth={1.75} />
              <h1 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t("doctorWorkspace.newPrescription")}
              </h1>
            </div>

            {!result && (
              <div className="flex flex-col gap-5 rounded-xl border border-panel-border bg-panel p-5 shadow-panel">
                <DoctorPicker value={doctor} onChange={setDoctor} />
                <PatientPicker value={patient} onChange={setPatient} />

                <div>
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-faint">
                    {t("doctorWorkspace.medicines")}
                  </label>
                  <PrescriptionItemsForm items={items} onChange={setItems} />
                </div>

                {error && (
                  <p className="rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                  {submitting ? t("doctorWorkspace.submitting") : t("doctorWorkspace.submitPrescription")}
                </button>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-panel-border bg-panel px-4 py-3 text-sm text-ink-muted">
                  {t("doctorWorkspace.prescriptionCreated")}{" "}
                  <span className="font-mono tabular text-ink">
                    #{result.prescription_id}
                  </span>{" "}
                  {t("doctorWorkspace.createdOutcome")}
                </div>

                <div className="flex flex-col gap-3">
                  {result.outcomes.map((outcome) => (
                    <OutcomeCard
                      key={outcome.medicine_id}
                      outcome={outcome}
                      onWhy={setWhyOutcome}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={startNewPrescription}
                  className="self-start rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
                >
                  {t("doctorWorkspace.newPrescriptionButton")}
                </button>
              </div>
            )}

            {doctor && <ReferralPanel doctor={doctor} patient={patient} />}
          </div>
        </main>
      </div>

      <OutcomeWhyDrawer outcome={whyOutcome} onClose={() => setWhyOutcome(null)} />
    </div>
  );
}
