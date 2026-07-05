"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { getPatients } from "@/lib/api";
import type { Patient } from "@/lib/types";

interface PatientPickerProps {
  value: Patient | null;
  onChange: (patient: Patient | null) => void;
}

export default function PatientPicker({ value, onChange }: PatientPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return;
    const handle = setTimeout(() => {
      getPatients(query || undefined)
        .then((res) => {
          setResults(res);
          setOpen(true);
        })
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (value) {
    return (
      <div>
        <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-faint">
          Patient
        </label>
        <div className="flex items-center justify-between rounded-lg border border-panel-border bg-panel px-3 py-2">
          <div>
            <p className="text-sm text-ink">{value.name}</p>
            {value.dob && (
              <p className="text-xs text-ink-faint">DOB {value.dob}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="rounded-md p-1 text-ink-faint transition-colors hover:text-ink"
            aria-label="Change patient"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-ink-faint">
        Patient
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search patient by name…"
          className="w-full rounded-lg border border-panel-border bg-panel py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-accent/50"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-panel-border bg-panel shadow-panel">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-panel-hover"
              >
                <span>{p.name}</span>
                {p.dob && (
                  <span className="text-xs text-ink-faint">{p.dob}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && (
        <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-panel-border bg-panel px-3 py-2 text-xs text-ink-faint shadow-panel">
          No matching patients
        </div>
      )}
    </div>
  );
}
