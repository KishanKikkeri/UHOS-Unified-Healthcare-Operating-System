import { UserRound, Stethoscope, Building2, BrainCircuit, HeartPulse, Network } from "lucide-react";

const NODES = [
  { key: "citizen", label: "Citizen", Icon: UserRound },
  { key: "doctor", label: "Doctor", Icon: Stethoscope },
  { key: "hospital", label: "Hospital", Icon: Building2 },
  { key: "districtAI", label: "District AI", Icon: BrainCircuit },
  { key: "pulseAI", label: "Pulse AI", Icon: HeartPulse },
  { key: "unified", label: "Unified Platform", Icon: Network },
] as const;

/**
 * Lightweight hand-rolled SVG/CSS illustration -- explicitly no Lottie
 * per the Phase 11 handover doc. A vertical flow of six nodes connected
 * by a single glowing line, echoing the Event Engine's own "everything
 * flows through one pipeline" story.
 */
export default function NetworkIllustration() {
  return (
    <div className="flex flex-col items-center gap-0">
      {NODES.map(({ key, label, Icon }, i) => (
        <div key={key} className="flex flex-col items-center">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-panel-border bg-panel px-6 py-4 shadow-panel">
            <Icon className="h-6 w-6 text-accent" strokeWidth={1.75} aria-hidden />
            <span className="text-xs font-medium text-ink-muted">{label}</span>
          </div>
          {i < NODES.length - 1 && (
            <div className="relative h-8 w-px bg-gradient-to-b from-accent/70 to-accent/10">
              <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 animate-pulse-beat rounded-full bg-accent" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
