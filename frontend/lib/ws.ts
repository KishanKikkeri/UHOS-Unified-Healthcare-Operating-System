import { API_BASE } from "./api";
import type { PulseEvent } from "./types";

/**
 * Real-time transport for exactly two UI elements — the Live Event
 * Timeline and the Pulse AI status indicator — per the Sprint 2 review
 * note. Every other card (alerts, facility scores) keeps using the
 * existing REST polling in page.tsx; this intentionally does not become
 * a general-purpose realtime layer.
 */

function wsUrl(): string {
  // API_BASE is an http(s) URL; the dashboard socket lives on the same
  // host/port as the REST API.
  return API_BASE.replace(/^http/, "ws") + "/ws/dashboard";
}

type DashboardSocketHandlers = {
  onEvent: (event: PulseEvent) => void;
  onPulse: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

/**
 * Opens the dashboard WebSocket and auto-reconnects with a short fixed
 * backoff if it drops (e.g. backend restart during a demo). Returns a
 * cleanup function to close the socket and stop reconnecting.
 */
export function connectDashboardSocket({
  onEvent,
  onPulse,
  onOpen,
  onClose,
}: DashboardSocketHandlers): () => void {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const connect = () => {
    if (stopped) return;

    socket = new WebSocket(wsUrl());

    socket.onopen = () => {
      onOpen?.();
    };

    socket.onmessage = (raw) => {
      try {
        const msg = JSON.parse(raw.data as string);
        if (msg.type === "event") {
          onEvent(msg.data as PulseEvent);
        } else if (msg.type === "pulse") {
          onPulse();
        }
      } catch {
        // ignore malformed frames
      }
    };

    socket.onclose = () => {
      onClose?.();
      if (!stopped) {
        reconnectTimer = setTimeout(connect, 2000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
