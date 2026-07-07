import {
  ShieldCheck,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  UserRound,
  type LucideIcon,
} from "lucide-react";

interface Stakeholder {
  Icon: LucideIcon;
  title: string;
  description: string;
}

const STAKEHOLDERS: Stakeholder[] = [
  {
    Icon: ShieldCheck,
    title: "District Admin",
    description: "Monitors every facility district-wide: alerts, analytics, and referral trends.",
  },
  {
    Icon: Building2,
    title: "Facility Admin",
    description: "Runs day-to-day operations for one PHC/CHC/hospital — beds, tests, and staffing.",
  },
  {
    Icon: Stethoscope,
    title: "Doctor",
    description: "Prescribes, refers, and allocates beds from a single workspace, with AI backing every call.",
  },
  {
    Icon: Pill,
    title: "Pharmacist",
    description: "Tracks medicine inventory and dispensing at their own facility.",
  },
  {
    Icon: FlaskConical,
    title: "Lab Technician",
    description: "Manages diagnostic test availability and turnaround at their facility.",
  },
  {
    Icon: UserRound,
    title: "Citizen",
    description: "Views their own appointments, prescriptions, and referral status from anywhere.",
  },
];

export default function StakeholderGrid() {
  return (
    <section className="border-b border-panel-border px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Built for Every Stakeholder
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAKEHOLDERS.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-xl border border-panel-border bg-panel p-5 shadow-panel"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                <Icon className="h-4.5 w-4.5 text-accent" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
