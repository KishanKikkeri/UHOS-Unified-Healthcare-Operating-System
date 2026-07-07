import {
  Brain,
  Route,
  BedDouble,
  Stethoscope,
  FileHeart,
  HeartPulse,
  Languages,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  Icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    Icon: Brain,
    title: "AI Medicine Forecasting",
    description:
      "Pulse AI predicts days-of-stock-remaining per facility and flags shortages before they become critical.",
  },
  {
    Icon: Route,
    title: "Smart Referrals",
    description:
      "Recommends the nearest facility that actually offers the needed service, with distance and reasoning shown.",
  },
  {
    Icon: BedDouble,
    title: "Bed Monitoring",
    description:
      "Ward-wise, bed-by-bed status across every facility — reserved, occupied, or available, updated live.",
  },
  {
    Icon: Stethoscope,
    title: "Doctor Availability",
    description:
      "Real-time attendance tracking so district admins always know who's on shift, where.",
  },
  {
    Icon: FileHeart,
    title: "Citizen Health Records",
    description:
      "A unified view of appointments, prescriptions, and dispensing history for every patient.",
  },
  {
    Icon: HeartPulse,
    title: "Pulse AI",
    description:
      "The engine behind every recommendation — redistribution, referrals, and facility health scores.",
  },
  {
    Icon: Languages,
    title: "Multilingual",
    description:
      "English, Hindi, Kannada, and Gujarati, switchable instantly across the entire platform.",
  },
  {
    Icon: Lightbulb,
    title: "Explainable AI",
    description:
      "Every AI recommendation ships with a \"Why?\" panel showing the exact inputs and logic behind it.",
  },
];

export default function FeatureGrid() {
  return (
    <section className="border-b border-panel-border px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Platform Features
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-panel-border bg-panel p-5 shadow-panel transition-colors hover:border-accent/30"
            >
              <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
