"use client";

import { useState } from "react";
import { Ambulance, MapPin, BedDouble, CheckCircle2 } from "lucide-react";
import {
  recommendReferral,
  createReferral,
  reserveBed,
  listBedUnits,
  ApiError,
} from "@/lib/api";
import type { Doctor, Patient, ReferralRecommendation, Referral, BedUnit } from "@/lib/types";

const COMMON_SERVICES = ["MRI", "CT Scan", "ICU", "Blood Bank", "Cardiology", "Neurology", "Ultrasound", "X-Ray"];

export default function ReferralPanel({ doctor, patient }: { doctor: Doctor | null; patient: Patient | null }) {
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<ReferralRecommendation | null>(null);
  const [referral, setReferral] = useState<Referral | null>(null);

  const [beds, setBeds] = useState<BedUnit[]>([]);
  const [reserving, setReserving] = useState(false);
  const [reservedBed, setReservedBed] = useState<BedUnit | null>(null);

  const canSearch = doctor != null && serviceName.trim().length > 0 && !loading;

  const handleSearch = async () => {
    if (!doctor || !serviceName.trim()) return;
    setLoading(true);
    setError(null);
    setRecommendation(null);
    setReferral(null);
    setReservedBed(null);
    try {
      const rec = await recommendReferral(doctor.phc_id, serviceName.trim());
      setRecommendation(rec);
      if (rec.recommended_facility_id) {
        try {
          const units = await listBedUnits(rec.recommended_facility_id);
          setBeds(units.filter((u) => u.status === "available"));
        } catch {
          setBeds([]);
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not fetch a referral recommendation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async () => {
    if (!doctor || !patient || !serviceName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createReferral({
        patient_id: patient.id,
        doctor_id: doctor.id,
        source_facility_id: doctor.phc_id,
        service_name: serviceName.trim(),
      });
      setReferral(res.referral);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the referral.");
    } finally {
      setLoading(false);
    }
  };

  const handleReserveBed = async (bedId: number) => {
    if (!doctor || !patient || !referral) return;
    setReserving(true);
    setError(null);
    try {
      const bed = await reserveBed(bedId, {
        patient_id: patient.id,
        doctor_id: doctor.id,
        referral_id: referral.id,
      });
      setReservedBed(bed);
      setReferral({ ...referral, status: "confirmed", bed_unit_id: bed.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reserve that bed.");
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-panel-border bg-panel p-5 shadow-panel">
      <div className="flex items-center gap-2 text-ink">
        <Ambulance className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Smart Referral
        </h2>
      </div>

      <div>
        <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-faint">
          Required Service
        </label>
        <input
          list="uhos-common-services"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
          placeholder="e.g. MRI"
          className="w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent/50"
        />
        <datalist id="uhos-common-services">
          {COMMON_SERVICES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {error && (
        <p className="rounded-lg border border-status-critical/40 bg-status-critical-soft px-3 py-2 text-xs text-status-critical">
          {error}
        </p>
      )}

      {!referral && (
        <button
          type="button"
          disabled={!canSearch}
          onClick={handleSearch}
          className="flex items-center justify-center gap-2 rounded-lg border border-panel-border px-4 py-2.5 text-sm font-semibold text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:border-accent/50 hover:text-accent"
        >
          <MapPin className="h-4 w-4" strokeWidth={2} />
          {loading ? "Searching…" : "Find Facility"}
        </button>
      )}

      {recommendation && !referral && (
        <div className="flex flex-col gap-2 rounded-lg border border-panel-border bg-base-raised px-3 py-3 text-sm">
          {recommendation.recommended_facility_id ? (
            <>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink">{recommendation.recommended_facility_name}</span>
                <span className="font-mono tabular text-xs text-ink-muted">{recommendation.distance_km} km</span>
              </div>
              <p className="text-xs text-ink-muted">{recommendation.reasoning}</p>
              <button
                type="button"
                disabled={!patient || loading}
                onClick={handleCreateReferral}
                className="mt-1 self-start rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-base transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate Referral
              </button>
              {!patient && (
                <p className="text-[11px] text-ink-faint">Select a patient above to generate the referral.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-muted">{recommendation.reasoning}</p>
          )}
        </div>
      )}

      {referral && (
        <div className="flex flex-col gap-3 rounded-lg border border-status-healthy/40 bg-status-healthy-soft px-3 py-3 text-sm text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-status-healthy" strokeWidth={2} />
            <span>
              Referral <span className="font-mono tabular">#{referral.id}</span> created — status{" "}
              <span className="font-medium">{referral.status}</span>
            </span>
          </div>
          <p className="text-xs text-ink-muted">{referral.reasoning}</p>

          {referral.status === "pending" && beds.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-ink-faint">
                <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
                Reserve a bed
              </span>
              <div className="flex flex-wrap gap-2">
                {beds.map((bed) => (
                  <button
                    key={bed.id}
                    type="button"
                    disabled={reserving}
                    onClick={() => handleReserveBed(bed.id)}
                    className="rounded-md border border-panel-border px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {bed.ward} · {bed.bed_number}
                  </button>
                ))}
              </div>
            </div>
          )}

          {reservedBed && (
            <p className="text-xs text-status-healthy">
              Bed {reservedBed.bed_number} ({reservedBed.ward}) reserved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
