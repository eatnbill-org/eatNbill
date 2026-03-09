import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TableManagement } from "./components/TableManagement";
import { ReservationManagement } from "./components/ReservationManagement";
import { useRestaurantStore } from "@/stores/restaurant";

export default function TablePage() {
  const { restaurant } = useRestaurantStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = React.useState<"tables" | "reservations">(
    searchParams.get("tab") === "reservations" ? "reservations" : "tables"
  );
  const shouldOpenReservationDialog = searchParams.get("open") === "new";

  React.useEffect(() => {
    const nextTab = searchParams.get("tab") === "reservations" ? "reservations" : "tables";
    setTab(nextTab);
  }, [searchParams]);

  if (!restaurant) {
    return <div>Loading...</div>;
  }

  const updateTab = (nextTab: "tables" | "reservations") => {
    setTab(nextTab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", nextTab);
    if (nextTab !== "reservations") {
      next.delete("open");
    }
    setSearchParams(next, { replace: true });
  };

  const handleOpenNewHandled = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("open");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="container max-w-5xl py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Table Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 font-medium">
          Configure dine-in tables, reservations, and QR codes.
        </p>
      </div>

      <div className="inline-flex w-full sm:w-auto rounded-xl border border-border p-1 bg-muted/30">
        <Button
          variant={tab === "tables" ? "default" : "outline"}
          onClick={() => updateTab("tables")}
          className="rounded-lg flex-1 sm:flex-none"
        >
          Tables
        </Button>
        <Button
          variant={tab === "reservations" ? "default" : "outline"}
          onClick={() => updateTab("reservations")}
          className="rounded-lg flex-1 sm:flex-none"
        >
          Reservations
        </Button>
      </div>

      {/* Main Content */}
      <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
        {tab === "tables" ? (
          <TableManagement slug={restaurant.slug} />
        ) : (
          <div className="p-4 sm:p-6">
            <ReservationManagement
              openNewDialog={shouldOpenReservationDialog}
              onOpenNewHandled={handleOpenNewHandled}
            />
          </div>
        )}
      </div>
    </div>
  );
}
