import { create } from "zustand";
import type { ReservationAlert } from "@/types/reservation";

export type ReservationAlertItem = ReservationAlert & {
  dedupe_key: string;
};

type ReservationAlertsState = {
  queue: ReservationAlertItem[];
  current: ReservationAlertItem | null;
  seenKeys: Set<string>;
  enqueueAlerts: (alerts: ReservationAlert[]) => number;
  dismissAlert: () => void;
  resetAlerts: () => void;
};

function buildDedupeKey(alert: ReservationAlert) {
  return `${alert.reservation.id}:${alert.event_type}`;
}

export const useReservationAlertsStore = create<ReservationAlertsState>((set, get) => ({
  queue: [],
  current: null,
  seenKeys: new Set<string>(),

  enqueueAlerts: (alerts) => {
    if (!alerts.length) return 0;

    const { seenKeys, current, queue } = get();
    const nextSeen = new Set(seenKeys);
    const incoming: ReservationAlertItem[] = [];

    const sortedAlerts = alerts
      .slice()
      .sort(
        (a, b) =>
          new Date(a.event_at).getTime() - new Date(b.event_at).getTime()
      );

    for (const alert of sortedAlerts) {
      const key = buildDedupeKey(alert);
      if (nextSeen.has(key)) continue;
      nextSeen.add(key);
      incoming.push({
        ...alert,
        dedupe_key: key,
      });
    }

    if (!incoming.length) {
      set({ seenKeys: nextSeen });
      return 0;
    }

    if (!current) {
      const [first, ...rest] = incoming;
      set({
        current: first ?? null,
        queue: [...queue, ...rest],
        seenKeys: nextSeen,
      });
      return incoming.length;
    }

    set({
      queue: [...queue, ...incoming],
      seenKeys: nextSeen,
    });
    return incoming.length;
  },

  dismissAlert: () => {
    const { queue } = get();
    if (!queue.length) {
      set({ current: null });
      return;
    }

    const [next, ...remaining] = queue;
    set({
      current: next ?? null,
      queue: remaining,
    });
  },

  resetAlerts: () => {
    set({
      queue: [],
      current: null,
      seenKeys: new Set<string>(),
    });
  },
}));
