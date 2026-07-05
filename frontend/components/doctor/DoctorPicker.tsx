"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getDoctors } from "@/lib/api";
import type { Doctor } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface DoctorPickerProps {
  value: Doctor | null;
  onChange: (doctor: Doctor | null) => void;
}

export default function DoctorPicker({ value, onChange }: DoctorPickerProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    getDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-faint">
        {t("doctorWorkspace.loggedInAs")}
      </label>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-lg border border-panel-border bg-panel px-3 py-2 pr-9 text-sm text-ink outline-none transition-colors focus:border-accent/50"
          value={value?.id ?? ""}
          onChange={(e) => {
            const doc =
              doctors.find((d) => d.id === Number(e.target.value)) ?? null;
            onChange(doc);
          }}
        >
          <option value="" disabled>
            {t("doctorWorkspace.selectDoctor")}
          </option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id} disabled={d.status !== "active"}>
              {d.name} — {d.specialization} ({d.phc_name})
              {d.status !== "active" ? " · absent" : ""}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      </div>
    </div>
  );
}
