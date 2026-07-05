import { FileX2 } from "lucide-react";

export default function ReportsTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border py-14 text-center">
      <FileX2 className="h-6 w-6 text-ink-faint" strokeWidth={1.5} />
      <p className="text-sm text-ink-muted">No reports uploaded yet.</p>
    </div>
  );
}
