import HeroSection from "@/components/landing/HeroSection";
import RoleSelectionSection from "@/components/landing/RoleSelectionSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import StakeholderGrid from "@/components/landing/StakeholderGrid";
import { ArchitectureOverview, TechStack } from "@/components/landing/ArchitectureAndStack";
import LandingFooter from "@/components/landing/LandingFooter";
import DemoModeBadge from "@/components/DemoModeBadge";
import { DEMO_MODE } from "@/lib/demoMode";

/**
 * Phase 11 — Landing Page. `/` used to open directly into the District
 * Command Center dashboard. That dashboard now lives at `/dashboard`
 * (district_admin only, behind AuthGuard); this route is the new public,
 * unauthenticated entry point.
 *
 * Phase 12 — Demo Mode. When NEXT_PUBLIC_DEMO_MODE=true, a one-click role
 * selection section is inserted right after the hero, and a small badge
 * marks the page as running in demo mode. When it's false, this renders
 * exactly as it did in Phase 11 -- RoleSelectionSection and the badge are
 * simply absent.
 */
export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-base">
      <DemoModeBadge floating />
      <HeroSection />
      {DEMO_MODE && <RoleSelectionSection />}
      <FeatureGrid />
      <StakeholderGrid />
      <ArchitectureOverview />
      <TechStack />
      <LandingFooter />
    </main>
  );
}
