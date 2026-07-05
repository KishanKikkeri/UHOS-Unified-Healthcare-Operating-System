"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { PatientHistory, HistoryPrescription } from "@/lib/types";
import { prescriptionDispenseStatus } from "@/lib/citizenHistory";
import { useLookups } from "@/lib/useLookups";
import DispenseStatusBadge from "./DispenseStatusBadge";
import PrescriptionDetailDrawer from "./PrescriptionDetailDrawer";

export default function PrescriptionsTab({ history }: { history: PatientHistory }) {
  const { doctorName } = useLookups();
  const [selected, setSelected] = useState<HistoryPrescription | null>(null);

  const sorted = [...history.prescriptions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
        No prescriptions on file yet.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {sorted.map((rx) => {
          const status = prescriptionDispenseStatus(rx);
          return (
            <button
              key={rx.prescription_id}
              type="button"
              onClick={() => setSelected(rx)}
              className="flex items-center justify-between gap-4 rounded-xl border border-panel-border bg-panel p-4 text-left shadow-panel transition-colors hover:border-accent/40"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Prescription #{rx.prescription_id}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {doctorName(rx.doctor_id)} · {new Date(rx.date).toLocaleDateString()}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {rx.items.length} medicine{rx.items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <DispenseStatusBadge status={status} />
            </button>
          );
        })}
      </div>

      <PrescriptionDetailDrawer prescription={selected} onClose={() => setSelected(null)} />
    </>
  );
}
