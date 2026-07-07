import { Github, HeartPulse } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="font-display text-xs font-bold tracking-[0.2em] text-ink">UHOS</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-muted">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink">
            <Github className="h-3.5 w-3.5" strokeWidth={1.75} /> GitHub
          </a>
          <span>MIT License</span>
          <span>Team UHOS</span>
          <span className="font-mono">v0.1.0 — Phase 11</span>
        </div>
      </div>
    </footer>
  );
}
