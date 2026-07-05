"use client";

import { useEffect, useState } from "react";
import { getDoctors, getDistrictFacilities } from "./api";
import type { Doctor, FacilitySummary } from "./types";

/**
 * The Citizen history payload only carries doctor_id / phc_id (see
 * ARCHITECTURE_DECISIONS.md — backend stays additive-read-only, no new
 * "joined" endpoint was added). This resolves those ids to display names
 * client-side from the two endpoints the Doctor Workspace and District
 * Dashboard already use — pure lookup, no new business logic.
 */
export function useLookups() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]));
    getDistrictFacilities()
      .then(setFacilities)
      .catch(() => setFacilities([]));
  }, []);

  const doctorName = (id: number): string =>
    doctors.find((d) => d.id === id)?.name ?? `Doctor #${id}`;

  const facilityName = (id: number): string =>
    facilities.find((f) => f.phc_id === id)?.name ?? `Facility #${id}`;

  return { doctors, facilities, doctorName, facilityName };
}
