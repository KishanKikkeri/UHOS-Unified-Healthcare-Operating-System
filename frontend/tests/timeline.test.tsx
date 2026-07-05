import { describe, it, expect } from "vitest";
import { screen, render } from "@testing-library/react";
import EventTimeline from "@/components/EventTimeline";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { renderWithProviders } from "./test-utils";
import type { PulseEvent } from "@/lib/types";

const baseEvent: PulseEvent = {
  id: 1,
  event_type: "prescription_created",
  payload: null,
  created_at: new Date().toISOString(),
};

describe("EventTimeline", () => {
  it("shows an empty state with no events", () => {
    renderWithProviders(<EventTimeline events={[]} />);
    expect(screen.getByText(/No events yet/i)).toBeInTheDocument();
  });

  it("renders a known event type with its friendly label", () => {
    renderWithProviders(<EventTimeline events={[baseEvent]} />);
    expect(screen.getByText("Prescription Created")).toBeInTheDocument();
  });

  it("receives and renders new events on re-render", () => {
    const { rerender } = render(
      <LanguageProvider>
        <EventTimeline events={[baseEvent]} />
      </LanguageProvider>
    );
    expect(screen.getByText("Prescription Created")).toBeInTheDocument();

    const newEvent: PulseEvent = {
      id: 2,
      event_type: "medicine_dispensed",
      payload: null,
      created_at: new Date().toISOString(),
    };
    rerender(
      <LanguageProvider>
        <EventTimeline events={[newEvent, baseEvent]} />
      </LanguageProvider>
    );

    expect(screen.getByText("Medicine Dispensed")).toBeInTheDocument();
    expect(screen.getByText("Prescription Created")).toBeInTheDocument();
  });
});
