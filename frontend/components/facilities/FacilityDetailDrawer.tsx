"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wrench, BedDouble, Stethoscope, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFacilityServices, getFacilityWards, getDoctors, ApiError } from "@/lib/api";
import type {
  FacilitySummary,
  FacilityAttendance,
  FacilityBeds,
  FacilityFootfall,
  FacilityTests,
  FacilityServices,
  FacilityWardSummary,
  Doctor,
} from "@/lib/types";
import type { FacilityDrawerTab } from "./FacilityCard";

interface FacilityDetailDrawerProps {
  facility: FacilitySummary | null;
  tab: FacilityDrawerTab;
  onTabChange: (tab: FacilityDrawerTab) => void;
  onClose: () => void;
  attendance?: FacilityAttendance;
  beds?: FacilityBeds;
  footfall?: FacilityFootfall;
  tests?: FacilityTests;
}

const TABS: { key: FacilityDrawerTab; label: string; icon: typeof Info }[] = [
  { key: "details", label: "Details", icon: Info },
  { key: "services", label: "Services", icon: Wrench },
  { key: "beds", label: "Beds", icon: BedDouble },
  { key: "doctors", label: "Doctors", icon: Stethoscope },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-panel-border py-3 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span className="font-mono tabular text-sm text-ink">{value}</span>
    </div>
  );
}

export default function FacilityDetailDrawer({
  facility,
  tab,
  onTabChange,
  onClose,
  attendance,
  beds,
  footfall,
  tests,
}: FacilityDetailDrawerProps) {
  const [services, setServices] = useState<FacilityServices | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [wards, setWards] = useState<FacilityWardSummary | null>(null);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsError, setWardsError] = useState<string | null>(null);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);

  useEffect(() => {
    if (!facility || tab !== "services" || services?.facility_id === facility.phc_id) return;
    setServicesLoading(true);
    setServicesError(null);
    getFacilityServices(facility.phc_id)
      .then(setServices)
      .catch((e) => setServicesError(e instanceof ApiError ? e.message : "Failed to load services."))
      .finally(() => setServicesLoading(false));
  }, [facility, tab, services]);

  useEffect(() => {
    if (!facility || tab !== "beds" || wards?.facility_id === facility.phc_id) return;
    setWardsLoading(true);
    setWardsError(null);
    getFacilityWards(facility.phc_id)
      .then(setWards)
      .catch((e) => setWardsError(e instanceof ApiError ? e.message : "Failed to load beds."))
      .finally(() => setWardsLoading(false));
  }, [facility, tab, wards]);

  useEffect(() => {
    if (!facility || tab !== "doctors") return;
    setDoctorsLoading(true);
    setDoctorsError(null);
    getDoctors(facility.phc_id)
      .then(setDoctors)
      .catch((e) => setDoctorsError(e instanceof ApiError ? e.message : "Failed to load doctors."))
      .finally(() => setDoctorsLoading(false));
  }, [facility, tab]);

  // Reset per-facility caches when the facility changes.
  useEffect(() => {
    setServices(null);
    setWards(null);
    setDoctors([]);
  }, [facility?.phc_id]);

  const open = facility != null;

  return (
    <AnimatePresence>
      {open && facility && (
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
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-panel-border bg-panel shadow-drawer"
          >
            <div className="h-0.5 w-full readout-hairline" />
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-ink">{facility.name}</h2>
                <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                  {facility.type} · {facility.district}
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

            <nav className="flex gap-1 border-b border-panel-border px-5">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTabChange(key)}
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

            <div className="max-h-[calc(100%-8rem)] overflow-y-auto px-5 pb-6">
              {tab === "details" && (
                <>
                  <Row label="Facility Health Score" value={`${facility.score}`} />
                  <Row label="Medicine Score" value={`${facility.medicine_score}`} />
                  <Row label="Doctor Score" value={`${facility.doctor_score}`} />
                  <Row
                    label="Doctor Availability"
                    value={attendance ? `${attendance.present}/${attendance.total} present` : "—"}
                  />
                  <Row
                    label="Bed Occupancy"
                    value={beds ? `${beds.occupied}/${beds.total} (${beds.occupancy_pct}%)` : "—"}
                  />
                  <Row
                    label="Patient Footfall (today)"
                    value={footfall ? `${footfall.today_patients}` : "—"}
                  />
                  <Row
                    label="Test Availability"
                    value={tests ? `${tests.availability_pct}%` : "—"}
                  />
                  <Row label="Referral Count" value="—" />
                  <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
                    Referral counts aren&apos;t broken out per facility by any existing endpoint —
                    only district-wide totals are available today, so this row shows a placeholder
                    dash rather than an invented number.
                  </p>
                </>
              )}

              {tab === "services" && (
                <>
                  {servicesLoading && <p className="py-6 text-sm text-ink-muted">Loading services…</p>}
                  {servicesError && (
                    <p className="py-4 text-xs text-status-critical">{servicesError}</p>
                  )}
                  {!servicesLoading && !servicesError && services && (
                    services.services.length === 0 ? (
                      <p className="py-6 text-center text-sm text-ink-faint">No services on file.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {services.services.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between rounded-lg border border-panel-border bg-base/60 px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="text-ink">{s.service_name}</p>
                              {s.category && (
                                <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                                  {s.category}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                s.available
                                  ? "bg-status-healthy-soft text-status-healthy"
                                  : "bg-status-critical-soft text-status-critical"
                              )}
                            >
                              {s.available ? "Available" : "Unavailable"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )
                  )}
                </>
              )}

              {tab === "beds" && (
                <>
                  {wardsLoading && <p className="py-6 text-sm text-ink-muted">Loading beds…</p>}
                  {wardsError && <p className="py-4 text-xs text-status-critical">{wardsError}</p>}
                  {!wardsLoading && !wardsError && wards && (
                    wards.wards.length === 0 ? (
                      <p className="py-6 text-center text-sm text-ink-faint">
                        No individually tracked beds yet.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {wards.wards.map((w) => (
                          <div key={w.ward} className="rounded-lg border border-panel-border bg-base/60 p-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-ink">{w.ward}</span>
                              <span className="font-mono tabular text-ink-muted">
                                {w.occupied + w.reserved}/{w.total}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[11px]">
                              <span className="text-status-healthy">{w.available} free</span>
                              <span className="text-status-warning">{w.reserved} reserved</span>
                              <span className="text-status-critical">{w.occupied} occupied</span>
                              <span className="text-ink-faint">{w.other} other</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </>
              )}

              {tab === "doctors" && (
                <>
                  {doctorsLoading && <p className="py-6 text-sm text-ink-muted">Loading doctors…</p>}
                  {doctorsError && <p className="py-4 text-xs text-status-critical">{doctorsError}</p>}
                  {!doctorsLoading && !doctorsError && (
                    doctors.length === 0 ? (
                      <p className="py-6 text-center text-sm text-ink-faint">No doctors on file.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {doctors.map((d) => {
                          const today = attendance?.doctors.find((a) => a.doctor_id === d.id);
                          return (
                            <li
                              key={d.id}
                              className="flex items-center justify-between rounded-lg border border-panel-border bg-base/60 px-3 py-2 text-sm"
                            >
                              <div>
                                <p className="text-ink">{d.name}</p>
                                <p className="text-[11px] uppercase tracking-wide text-ink-faint">
                                  {d.specialization}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-[11px] font-medium",
                                  (today?.status ?? d.status) === "present" ||
                                    (today?.status ?? d.status) === "active"
                                    ? "text-status-healthy"
                                    : "text-status-critical"
                                )}
                              >
                                {today ? (today.status === "present" ? "Present today" : "Absent today") : d.status}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
