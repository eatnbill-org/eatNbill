import * as React from "react";
import { useAdminOrdersStore } from "@/stores/orders";
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useProductsStore } from "@/stores/products";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Plus, Settings2, LayoutDashboard, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { useTableStore } from "@/stores/tables";

// Split Components
import { DashboardHeader } from "./components/DashboardHeader";
import { OrderStatsCards } from "./components/OrderStatsCards";
import { TopSellingCard } from "./components/TopSellingCard";
import { RushHourChart } from "./components/RushHourChart";
import { PaymentModal } from "./components/PaymentModal";
import { StockManagerSheet } from "./components/StockManagerSheet";
import { BillPrintSheet } from "./components/BillPrintSheet";
import { ActivityFeed } from "./components/ActivityFeed";
import { RevenueSourceSplit } from "./components/RevenueSourceSplit";
import { UnpaidBillsCard } from "./components/UnpaidBillsCard";
import { ActiveStaffCard } from "./components/ActiveStaffCard";
<<<<<<< HEAD
import { OnboardingChecklist } from "./components/OnboardingChecklist";
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
import { DashboardStatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

type DateRangeMode = "today" | "week" | "month";

const getDateRange = (mode: DateRangeMode) => {
  const now = new Date();
  switch (mode) {
    case "week":
      return { shiftStart: startOfWeek(now, { weekStartsOn: 1 }), shiftEnd: endOfWeek(now, { weekStartsOn: 1 }) };
    case "month":
      return { shiftStart: startOfMonth(now), shiftEnd: endOfMonth(now) };
    default:
      return { shiftStart: startOfDay(now), shiftEnd: endOfDay(now) };
  }
};

// Import helper
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export default function AdminDashboardPage() {
  useOnboarding();
  const { user } = useAuth();
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  const connectionMode = useRealtimeStore((state) => state.connectionMode);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    orders,
    fetchOrders,
    fetchStats,
    fetchRevenue,
    subscribeToOrders,
    unsubscribe,
    loading: ordersLoading
  } = useAdminOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { tables } = useTableStore();

  const [payment, setPayment] = React.useState<any>(null);
  const [billOrder, setBillOrder] = React.useState<any>(null);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [now, setNow] = React.useState(new Date());
  const [showProfit, setShowProfit] = React.useState(false);
  const [dateMode, setDateMode] = React.useState<DateRangeMode>("today");

  React.useEffect(() => {
    if (!restaurant) {
      fetchRestaurant();
    }
  }, [restaurant, fetchRestaurant]);

  const activeRestaurantId =
    restaurant?.id ||
    apiClient.getRestaurantId() ||
    user?.allowed_restaurant_ids?.[0] ||
    null;

  const refreshOrderWidgets = React.useCallback((mode: DateRangeMode = dateMode) => {
    const { shiftStart, shiftEnd } = getDateRange(mode);
    fetchOrders({
      from_date: shiftStart.toISOString(),
      to_date: shiftEnd.toISOString(),
      limit: 200,
    });
    fetchStats();
    fetchRevenue();
  }, [fetchOrders, fetchStats, fetchRevenue, dateMode]);

  const handleDateModeChange = (mode: DateRangeMode) => {
    setDateMode(mode);
    refreshOrderWidgets(mode);
  };

  // Initial Fetch & Realtime Subscription
  React.useEffect(() => {
    refreshOrderWidgets();

    fetchProducts();

    if (activeRestaurantId) {
      subscribeToOrders(activeRestaurantId);
    }

    const clockId = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(clockId);
      unsubscribe();
    };
  }, [activeRestaurantId, fetchProducts, refreshOrderWidgets, subscribeToOrders, unsubscribe]);

  React.useEffect(() => {
    if (connectionMode !== 'polling') {
      return;
    }

    const intervalId = setInterval(() => {
      refreshOrderWidgets();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [connectionMode, refreshOrderWidgets]);

  React.useEffect(() => {
    if (connectionMode === 'realtime') {
      refreshOrderWidgets();
    }
  }, [connectionMode, refreshOrderWidgets]);

  // Derived Data for the selected date range
  const shiftOrders = React.useMemo(() => {
    const { shiftStart, shiftEnd } = getDateRange(dateMode);
    return (orders || []).filter(o => {
      const placedAt = new Date(o.placed_at);
      return placedAt >= shiftStart && placedAt <= shiftEnd;
    });
  }, [orders, dateMode]);

  const earnings = React.useMemo(() => {
    return shiftOrders
      .filter(o => o.payment_status === "PAID" && o.status === "COMPLETED")
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  }, [shiftOrders]);

  const profitValue = React.useMemo(() => {
    return shiftOrders
      .filter(o => o.payment_status === "PAID" && o.status === "COMPLETED")
      .reduce((acc, order) => {
        const orderCost = order.items.reduce((c, item) => {
          // Use cost_snapshot if available (from order time), otherwise fallback to 0
          const cost = item.cost_snapshot ? parseFloat(item.cost_snapshot) : 0;
          return c + (cost * item.quantity);
        }, 0);
        return acc + (parseFloat(order.total_amount) - orderCost);
      }, 0);
  }, [shiftOrders]); // Removed products dependency - now independent!

  const topSellingData = React.useMemo(() => {
    const qtyMap = new Map<string, { qty: number, name: string, imageUrl?: string | null }>();
    shiftOrders.forEach(o => o.items.forEach(it => {
      const existing = qtyMap.get(it.product_id) || { qty: 0, name: it.name_snapshot };
      qtyMap.set(it.product_id, {
        qty: existing.qty + it.quantity,
        name: it.name_snapshot,
        imageUrl: products.find(p => p.id === it.product_id)?.images?.[0]?.public_url
      });
    }));
    return Array.from(qtyMap.values()).sort((a, b) => b.qty - a.qty);
  }, [shiftOrders, products]);

  const rushHourData = React.useMemo(() => {
    const counts = new Array(24).fill(0);
    shiftOrders.forEach(o => counts[new Date(o.placed_at).getHours()]++);
    // Standard 24-hour sequence (morning to night)
    const seq = Array.from({ length: 24 }, (_, i) => i);
    return seq.map(h => {
      const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      return { hour: label, orders: counts[h] };
    });
  }, [shiftOrders]);

  const hasOutOfStock = React.useMemo(() => products.some(p => !p.is_active), [products]);

  const handleNewOrder = () => {
    const base = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    navigate(`${base}/orders?new=true`);
  };

  const handleNewReservation = () => {
    const base = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    navigate(`${base}/company/tables?tab=reservations&open=new`);
  };

  if (ordersLoading && (!orders || orders.length === 0)) {
    return (
      <div className="space-y-6 py-4">
        <DashboardStatsSkeleton />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 space-y-6 max-w-7xl mx-auto pb-20 no-scrollbar px-3 sm:px-4 lg:px-6">
      {/* Page Title Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-1 px-1">
            <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          </div>
          <div className="px-1 flex flex-col">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-0.5">
              {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-2xl font-bold text-foreground tracking-tight leading-none">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
        </div>

<<<<<<< HEAD
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 sm:gap-3">
          {/* Date range toggle */}
          <div className="flex bg-white border border-border rounded-lg overflow-hidden shadow-sm">
            {(["today", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleDateModeChange(mode)}
                className={`px-3 py-2 text-xs font-bold transition-all capitalize ${dateMode === mode ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent"}`}
              >
                {mode === "today" ? "Today" : mode === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
        </div>

=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2 sm:gap-3 bg-white p-2 rounded-xl border border-border shadow-sm">
          <Button
            variant="outline"
            onClick={() => setStockOpen(true)}
            className="relative h-10 sm:h-11 px-4 sm:px-5 rounded-lg border-border font-semibold text-sm text-muted-foreground hover:bg-accent transition-all w-full sm:w-auto"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Manage Stock
            {hasOutOfStock && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive/75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleNewReservation}
            className="h-10 sm:h-11 px-4 sm:px-5 rounded-lg border-border font-semibold text-sm text-muted-foreground hover:bg-accent transition-all w-full sm:w-auto"
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            Reservation
          </Button>
          <Button
            onClick={handleNewOrder}
            className="h-10 sm:h-11 px-4 sm:px-6 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold text-sm shadow-md transition-all w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </motion.div>

      <OrderStatsCards />

      <OnboardingChecklist
        hasProducts={products.length > 0}
        hasTables={tables.length > 0}
        hasOrders={orders.length > 0}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <ActivityFeed />
          <ActiveStaffCard />
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <RevenueSourceSplit
              profit={profitValue}
              showProfit={showProfit}
              setShowProfit={setShowProfit}
            />
            <UnpaidBillsCard />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopSellingCard data={topSellingData} products={products} />
            <RushHourChart data={rushHourData} />
          </div>
        </div>
      </div>

      <PaymentModal order={payment} onClose={() => setPayment(null)} />
      <StockManagerSheet open={stockOpen} onOpenChange={setStockOpen} />
      <BillPrintSheet order={billOrder} onOpenChange={(o) => !o && setBillOrder(null)} />
    </div>
  );
}
