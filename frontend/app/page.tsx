import HeroSection from "@/components/landing/HeroSection";
import FeatureGrid from "@/components/landing/FeatureGrid";
import StakeholderGrid from "@/components/landing/StakeholderGrid";
import { ArchitectureOverview, TechStack } from "@/components/landing/ArchitectureAndStack";
import LandingFooter from "@/components/landing/LandingFooter";

/**
 * Phase 11 — Landing Page.
 *
 * `/` used to open directly into the District Command Center dashboard.
 * That dashboard now lives at `/dashboard` (district_admin only, behind
 * AuthGuard); this route is the new public, unauthenticated entry point.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-base">
      <HeroSection />
      <FeatureGrid />
      <StakeholderGrid />
      <ArchitectureOverview />
      <TechStack />
      <LandingFooter />
    </main>
  );
}
