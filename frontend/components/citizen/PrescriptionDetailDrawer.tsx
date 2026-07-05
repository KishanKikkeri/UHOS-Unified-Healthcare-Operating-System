"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ArrowRightLeft } from "lucide-react";
import type { HistoryPrescription, HistoryPrescriptionItem } from "@/lib/types";
import { itemDispenseStatus } from "@/lib/citizenHistory";
import { useLookups } from "@/lib/useLookups";
import DispenseStatusBadge from "./DispenseStatusBadge";

interface PrescriptionDetailDrawerProps {
  prescription: HistoryPrescription | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-panel-border py-2.5 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="font-mono tabular text-sm text-ink">{value}</span>
    </div>
  );
}

/**
 * "Why?" here renders the dispensing events already stored against this
 * prescription item — facility, quantity, and whether it came via
 * redistribution. Nothing is recomputed; historical AI reasoning text
 * isn't persisted per-item, so this shows the same underlying facts the
 * backend recorded at dispensing time.
 */
function ItemWhyPanel({ item }: { item: HistoryPrescriptionItem }) {
  const { facilityName } = useLookups();

  if (item.dispensing_events.length === 0) {
    return (
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        Not yet dispensed — no dispensing event has been recorded for this
        medicine.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {item.dispensing_events.map((event, i) => (
        <div
          key={i}
          className="rounded-lg border border-panel-border bg-base/60 p-2.5"
        >
          <div className="flex items-center gap-1.5 text-xs text-ink">
            {event.was_redistributed && (
              <ArrowRightLeft className="h-3 w-3 text-status-warning" strokeWidth={2} />
            )}
            <span>{event.quantity} units from {facilityName(event.from_phc_id)}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            {event.was_redistributed
              ? "Transferred in via Pulse AI redistribution."
              : "Dispensed from local stock."}{" "}
            {new Date(event.timestamp).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function PrescriptionDetailDrawer({
  prescription,
  onClose,
}: PrescriptionDetailDrawerProps) {
  const { doctorName, facilityName, doctors } = useLookups();
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  const open = prescription != null;
  const doctorId = prescription?.doctor_id;
  const facilityId = doctors.find((d) => d.id === doctorId)?.phc_id;

  return (
    <AnimatePresence>
      {open && prescription && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-panel-border bg-panel shadow-drawer"
          >
            <div className="h-0.5 w-full readout-hairline" />
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-ink">
                  Prescription #{prescription.prescription_id}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {new Date(prescription.date).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-ink-faint transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-6">
              <div className="mb-4 rounded-lg border border-panel-border bg-base/60 p-3">
                <Row label="Doctor" value={doctorId != null ? doctorName(doctorId) : "—"} />
                <Row
                  label="Facility"
                  value={facilityId != null ? facilityName(facilityId) : "—"}
                />
              </div>

              <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">
                Medicines
              </p>
              <div className="flex flex-col gap-3">
                {prescription.items.map((item, i) => {
                  const key = `${prescription.prescription_id}-${item.medicine}-${i}`;
                  const status = itemDispenseStatus(item);
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-panel-border bg-base/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {item.medicine}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {item.quantity_prescribed} units prescribed
                          </p>
                        </div>
                        <DispenseStatusBadge status={status} />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenWhy(openWhy === key ? null : key)
                        }
                        className="mt-2 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        {openWhy === key ? "HIDE" : "WHY?"}
                      </button>

                      {openWhy === key && <ItemWhyPanel item={item} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
