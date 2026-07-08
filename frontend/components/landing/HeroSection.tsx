"use client";

import Link from "next/link";
import { Github, PlayCircle, HeartPulse, Sparkles } from "lucide-react";
import NetworkIllustration from "./NetworkIllustration";
import { DEMO_MODE } from "@/lib/demoMode";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-panel-border px-6 py-20 sm:py-28">
      {/* Same restrained cyan-on-black language as the rest of Mission Control. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px circle at 20% 10%, rgba(45,212,240,0.10), transparent 60%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft">
              <HeartPulse className="h-5 w-5 text-accent" strokeWidth={2} />
            </span>
            <span className="font-display text-lg font-bold tracking-[0.25em] text-ink">UHOS</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            Unified Healthcare
            <br />
            Operating System
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            An AI-powered, multilingual, event-driven platform that gives PHCs, CHCs,
            and District Hospitals one shared source of truth — from medicine stock
            and bed availability to referrals and doctor attendance — with Pulse AI
            explaining every recommendation it makes.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            {DEMO_MODE && (
              <a
                href="#select-role"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-base transition-transform hover:scale-[1.02] hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2} /> Select Your Role
              </a>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-panel-border bg-panel px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:bg-panel-hover"
            >
              <PlayCircle className="h-4 w-4 text-accent" strokeWidth={1.75} /> View Demo
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-transparent px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <Github className="h-4 w-4" strokeWidth={1.75} /> GitHub
            </a>
          </div>
        </div>

        <div className="flex justify-center">
          <NetworkIllustration />
        </div>
      </div>
    </section>
  );
}
