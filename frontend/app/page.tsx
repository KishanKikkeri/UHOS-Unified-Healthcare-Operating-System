"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Building2, Activity } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import AlertCard from "@/components/AlertCard";
import FacilityScoreCard from "@/components/FacilityScoreCard";
import EventTimeline from "@/components/EventTimeline";
import WhyDrawer from "@/components/WhyDrawer";
import {
  getDistrictAlerts,
  getDistrictFacilities,
  getRecentEvents,
  getMedicines,
  getAlertExplanation,
} from "@/lib/api";
import { connectDashboardSocket } from "@/lib/ws";
import type {
  StockAlert,
  FacilitySummary,
  PulseEvent,
  Medicine,
  AlertExplanation,
} from "@/lib/types";

const POLL_INTERVAL_MS = 8000;
const MAX_TIMELINE_EVENTS = 30;

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  // `live` now reflects the Pulse AI WebSocket connection itself, not a
  // REST poll result — see the Sprint 2 review note on real-time feel.
  const [live, setLive] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explanation, setExplanation] = useState<AlertExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  // Alerts + Facility Scores stay on normal REST polling per the review note.
  const refresh = useCallback(async () => {
    try {
      const [a, f] = await Promise.all([
        getDistrictAlerts(),
        getDistrictFacilities(),
      ]);
      setAlerts(a);
      setFacilities(f);
    } catch {
      // alert/facility polling failure doesn't affect the live indicator —
      // that's owned by the WebSocket now.
    }
  }, []);

  useEffect(() => {
    getMedicines()
      .then(setMedicines)
      .catch(() => setMedicines([]));

    // Seed the timeline once via REST so it isn't empty while waiting for
    // the socket's next push (the socket itself only sends events newer
    // than the moment it connected).
    getRecentEvents(20)
      .then(setEvents)
      .catch(() => setEvents([]));

    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Live Event Timeline + Pulse AI status: WebSocket-driven.
  useEffect(() => {
    const disconnect = connectDashboardSocket({
      onEvent: (event) => {
        setEvents((prev) => {
          if (prev.some((e) => e.id === event.id)) return prev;
          return [event, ...prev].slice(0, MAX_TIMELINE_EVENTS);
        });
      },
      onPulse: () => setLive(true),
      onClose: () => setLive(false),
    });
    return disconnect;
  }, []);

  const facilityName = (phcId: number) =>
    facilities.find((f) => f.phc_id === phcId)?.name ?? `Facility #${phcId}`;
  const medicineName = (medicineId: number) =>
    medicines.find((m) => m.id === medicineId)?.name ?? `Medicine #${medicineId}`;

  const handleWhy = async (alertId: number) => {
    setDrawerOpen(true);
    setExplanationLoading(true);
    try {
      const data = await getAlertExplanation(alertId);
      setExplanation(data);
    } catch {
      setExplanation(null);
    } finally {
      setExplanationLoading(false);
    }
  };

  const criticalCount = alerts.filter((a) => a.days_remaining < 2).length;

  return (
    <div className="flex h-screen flex-col">
      <Topbar district="Mysuru District" live={live} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            {/* Stat strip */}
            <div className="flex gap-3">
              <StatCard
                label="Open Alerts"
                value={alerts.length}
                icon={AlertTriangle}
                tone={alerts.length > 0 ? "warning" : "default"}
              />
              <StatCard
                label="Critical (<2 days)"
                value={criticalCount}
                icon={AlertTriangle}
                tone={criticalCount > 0 ? "critical" : "default"}
              />
              <StatCard
                label="Facilities Monitored"
                value={facilities.length}
                icon={Building2}
              />
              <StatCard
                label="Events Logged"
                value={events.length}
                icon={Activity}
              />
            </div>

            {/* Critical Alerts */}
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Critical Alerts
              </h2>
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-panel-border bg-panel px-4 py-6 text-center text-sm text-ink-muted">
                  No open alerts — every facility is above its safety threshold.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      medicineName={medicineName(alert.medicine_id)}
                      facilityName={facilityName(alert.phc_id)}
                      sourceFacilityName={
                        alert.recommended_source_phc_id != null
                          ? facilityName(alert.recommended_source_phc_id)
                          : null
                      }
                      onWhy={handleWhy}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Facility Health Scores + Live Event Timeline */}
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Facility Health Scores
                </h2>
                <div className="flex flex-col gap-2">
                  {facilities.map((f) => (
                    <FacilityScoreCard key={f.phc_id} facility={f} />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Live Event Timeline
                </h2>
                <div className="rounded-xl border border-panel-border bg-panel p-4">
                  <EventTimeline events={events} />
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      <WhyDrawer
        open={drawerOpen}
        loading={explanationLoading}
        explanation={explanation}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
