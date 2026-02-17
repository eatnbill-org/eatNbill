import { TableManagement } from "./components/TableManagement";
import { useRestaurantStore } from "@/stores/restaurant";

export default function TablePage() {
  const { restaurant } = useRestaurantStore();

  if (!restaurant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Table Management</h1>
        <p className="text-muted-foreground mt-1 font-medium">Configure dine-in tables, areas, and QR codes.</p>
      </div>

      {/* Main Content */}
      <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
        <TableManagement slug={restaurant.slug} />
      </div>
    </div>
  );
}