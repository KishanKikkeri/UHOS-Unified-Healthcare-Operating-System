import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import WhyDrawer from "@/components/WhyDrawer";
import { renderWithProviders } from "./test-utils";
import type { AlertExplanation } from "@/lib/types";

const explanation: AlertExplanation = {
  alert_id: 1,
  current_stock: 2,
  avg_daily_consumption: 1.5,
  days_remaining: 1.3,
  safety_threshold_days: 5,
  recommended_transfer_qty: 10,
  recommended_source_phc_id: 2,
  recommended_source_phc_name: "CHC Hebbal",
  distance_km: 8.4,
  reasoning: "Stock expected to exhaust before safety threshold.",
};

describe("WhyDrawer", () => {
  it("does not render its content when closed", () => {
    renderWithProviders(
      <WhyDrawer open={false} loading={false} explanation={null} onClose={() => {}} />
    );
    expect(screen.queryByText("Why this recommendation?")).not.toBeInTheDocument();
  });

  it("opens and shows a loading state", () => {
    renderWithProviders(
      <WhyDrawer open loading explanation={null} onClose={() => {}} />
    );
    expect(screen.getByText("Why this recommendation?")).toBeInTheDocument();
    expect(screen.getByText("Loading explanation…")).toBeInTheDocument();
  });

  it("renders the explanation breakdown once loaded", () => {
    renderWithProviders(
      <WhyDrawer open loading={false} explanation={explanation} onClose={() => {}} />
    );
    expect(screen.getByText("CHC Hebbal")).toBeInTheDocument();
    expect(screen.getByText("8.4 km")).toBeInTheDocument();
    expect(
      screen.getByText("Stock expected to exhaust before safety threshold.")
    ).toBeInTheDocument();
  });
});
