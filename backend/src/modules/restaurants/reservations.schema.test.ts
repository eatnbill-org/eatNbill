import { describe, expect, it } from "bun:test";
import {
  createTableReservationSchema,
  updateTableReservationSchema,
  tableAvailabilityQuerySchema,
  reservationAlertsQuerySchema,
} from "./schema";

describe("Reservation Schemas", () => {
  it("accepts valid reservation payload", () => {
    const result = createTableReservationSchema.safeParse({
      table_id: "0f6f9059-69c6-4aa0-a9c3-89d88084f718",
      customer_name: "John Doe",
      customer_phone: "9999999999",
      party_size: 4,
      reserved_from: "2026-03-10T12:00:00.000Z",
      reserved_to: "2026-03-10T13:00:00.000Z",
      status: "BOOKED",
      notes: "Birthday",
    });

    expect(result.success).toBe(true);
  });

  it("rejects reservation when reserved_to is before reserved_from", () => {
    const result = createTableReservationSchema.safeParse({
      table_id: "0f6f9059-69c6-4aa0-a9c3-89d88084f718",
      customer_name: "John Doe",
      party_size: 4,
      reserved_from: "2026-03-10T13:00:00.000Z",
      reserved_to: "2026-03-10T12:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects update payload when both times are invalid", () => {
    const result = updateTableReservationSchema.safeParse({
      reserved_from: "2026-03-10T15:00:00.000Z",
      reserved_to: "2026-03-10T14:30:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid availability range", () => {
    const result = tableAvailabilityQuerySchema.safeParse({
      start_at: "2026-03-10T16:00:00.000Z",
      end_at: "2026-03-10T16:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid alert range", () => {
    const result = reservationAlertsQuerySchema.safeParse({
      from: "2026-03-10T16:00:00.000Z",
      to: "2026-03-10T15:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
