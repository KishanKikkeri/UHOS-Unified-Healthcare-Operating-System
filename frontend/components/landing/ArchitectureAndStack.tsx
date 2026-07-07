import { Server, Radio, Database, Layers } from "lucide-react";

const STACK = [
  { label: "FastAPI", note: "Backend API" },
  { label: "Next.js", note: "Frontend" },
  { label: "PostgreSQL", note: "Production DB" },
  { label: "WebSockets", note: "Live updates" },
  { label: "Tailwind", note: "Styling" },
  { label: "TypeScript", note: "Type safety" },
];

export function ArchitectureOverview() {
  return (
    <section className="border-b border-panel-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Architecture Overview
        </h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: Layers, title: "Facilities", note: "PHCs, CHCs & District Hospitals report state" },
            { Icon: Radio, title: "Event Engine", note: "Every action writes one append-only event" },
            { Icon: Server, title: "Pulse AI", note: "Recomputes forecasts, scores & referrals" },
            { Icon: Database, title: "District Command Center", note: "One dashboard, district-wide" },
          ].map(({ Icon, title, note }, i) => (
            <div key={title} className="relative rounded-xl border border-panel-border bg-panel p-5 shadow-panel">
              <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{note}</p>
              {i < 3 && (
                <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ink-faint lg:block">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-ink-faint">
          Every write to the system emits an event; the Event Engine triggers Pulse AI to
          recompute forecasts, redistribution plans, referral recommendations, and facility
          health scores — so the dashboard is always reacting to what actually happened,
          not a stale cache.
        </p>
      </div>
    </section>
  );
}

export function TechStack() {
  return (
    <section className="border-b border-panel-border px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-ink-faint">
          Technology Stack
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STACK.map(({ label, note }) => (
            <div
              key={label}
              className="rounded-xl border border-panel-border bg-panel px-4 py-5 text-center shadow-panel"
            >
              <p className="font-mono text-sm font-semibold text-ink">{label}</p>
              <p className="mt-1 text-[11px] text-ink-faint">{note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
