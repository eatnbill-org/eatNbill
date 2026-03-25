import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CheckoutDialog from "./CheckoutDialog";
import { DemoStoreProvider } from "@/store/demo-store";

describe("CheckoutDialog reservation warnings", () => {
  it("shows warning when waiter selects a reserved table", () => {
    if (typeof document === "undefined") {
      return;
    }

    render(
      <DemoStoreProvider>
        <CheckoutDialog
          open={true}
          onOpenChange={vi.fn()}
          items={[{ id: "p1", name: "Paneer Tikka", qty: 1, price: 220 }]}
          tableId="table-1"
          tables={[
            {
              id: "table-1",
              table_number: "A1",
              is_active: true,
              is_reserved_now: true,
              current_reservation: {
                id: "res-1",
                customer_name: "Aman",
                reserved_from: "2026-03-10T12:00:00.000Z",
                reserved_to: "2026-03-10T13:00:00.000Z",
              },
            },
          ]}
          isWaiterMode={true}
          customerFieldsOptional={true}
          onSubmit={vi.fn()}
        />
      </DemoStoreProvider>
    );

    expect(
      screen.getByText(/Order is allowed, but confirm with guest\./i)
    ).toBeInTheDocument();
  });
});
