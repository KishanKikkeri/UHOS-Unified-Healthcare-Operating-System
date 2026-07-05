"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { getMedicines } from "@/lib/api";
import type { Medicine } from "@/lib/types";

export interface DraftItem {
  key: string;
  medicine_id: number | "";
  quantity: string;
}

let keyCounter = 0;
export function newDraftItem(): DraftItem {
  keyCounter += 1;
  return { key: `item-${keyCounter}`, medicine_id: "", quantity: "" };
}

interface PrescriptionItemsFormProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

export default function PrescriptionItemsForm({
  items,
  onChange,
}: PrescriptionItemsFormProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  useEffect(() => {
    getMedicines()
      .then(setMedicines)
      .catch(() => setMedicines([]));
  }, []);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: string) => {
    onChange(items.filter((it) => it.key !== key));
  };

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const medicine = medicines.find((m) => m.id === item.medicine_id);
        return (
          <div key={item.key} className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                className="w-full appearance-none rounded-lg border border-panel-border bg-panel px-3 py-2 pr-9 text-sm text-ink outline-none transition-colors focus:border-accent/50"
                value={item.medicine_id}
                onChange={(e) =>
                  updateItem(item.key, {
                    medicine_id: e.target.value ? Number(e.target.value) : "",
                  })
                }
              >
                <option value="" disabled>
                  Select medicine…
                </option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            </div>

            <div className="flex w-32 items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-3 py-2">
              <input
                type="number"
                min={1}
                step={1}
                value={item.quantity}
                onChange={(e) =>
                  updateItem(item.key, { quantity: e.target.value })
                }
                placeholder="Qty"
                className="w-full bg-transparent font-mono tabular text-sm text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              {medicine && (
                <span className="shrink-0 text-xs text-ink-faint">
                  {medicine.unit}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeItem(item.key)}
              className="shrink-0 rounded-md p-2 text-ink-faint transition-colors hover:text-status-critical"
              aria-label="Remove medicine"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...items, newDraftItem()])}
        className="mt-1 flex items-center gap-1.5 self-start rounded-md border border-dashed border-panel-border px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        Add medicine
      </button>
    </div>
  );
}
