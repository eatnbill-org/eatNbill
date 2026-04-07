import { beforeEach, describe, expect, it } from "vitest";
import { useReservationAlertsStore } from "./reservation-alerts.store";
import type { ReservationAlert } from "@/types/reservation";

function createAlert(
  reservationId: string,
  eventType: ReservationAlert["event_type"],
  eventAt: string
): ReservationAlert {
  return {
    event_type: eventType,
    event_at: eventAt,
    reservation: {
      id: reservationId,
      tenant_id: "tenant-1",
      restaurant_id: "restaurant-1",
      table_id: "table-1",
      customer_name: "Test Guest",
      customer_phone: null,
      customer_email: null,
      party_size: 2,
      reserved_from: "2026-03-09T12:30:00.000Z",
      reserved_to: "2026-03-09T13:30:00.000Z",
      notes: null,
      status: "BOOKED",
      created_by_user_id: "user-1",
      created_at: "2026-03-09T10:00:00.000Z",
      updated_at: "2026-03-09T10:00:00.000Z",
      cancelled_at: null,
    },
  };
}

describe("reservation-alerts.store", () => {
  beforeEach(() => {
    useReservationAlertsStore.getState().resetAlerts();
  });

  it("deduplicates reservationId:eventType alerts in the same session", () => {
    const store = useReservationAlertsStore.getState();
    const alert = createAlert("res-1", "T_MINUS_10", "2026-03-09T12:20:00.000Z");

    const firstAdd = store.enqueueAlerts([alert]);
    const duplicateAdd = useReservationAlertsStore.getState().enqueueAlerts([alert]);

    expect(firstAdd).toBe(1);
    expect(duplicateAdd).toBe(0);
    expect(useReservationAlertsStore.getState().current?.reservation.id).toBe("res-1");
    expect(useReservationAlertsStore.getState().queue).toHaveLength(0);
  });

  it("queues additional alerts and rotates to next alert on dismiss", () => {
    const store = useReservationAlertsStore.getState();
    const first = createAlert("res-1", "T_MINUS_10", "2026-03-09T12:20:00.000Z");
    const second = createAlert("res-1", "START", "2026-03-09T12:30:00.000Z");

    const added = store.enqueueAlerts([first, second]);
    expect(added).toBe(2);
    expect(useReservationAlertsStore.getState().current?.event_type).toBe("T_MINUS_10");
    expect(useReservationAlertsStore.getState().queue).toHaveLength(1);

    useReservationAlertsStore.getState().dismissAlert();
    expect(useReservationAlertsStore.getState().current?.event_type).toBe("START");
    expect(useReservationAlertsStore.getState().queue).toHaveLength(0);
  });
});
