import * as React from "react";
import { useAdminOrdersStore } from "@/stores/orders";
import { useProductsStore } from "@/stores/products";
import { Plus, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

// Reuse Admin Dashboard Components
import { OrderStatsCards } from "@/pages/admin/dashboard/components/OrderStatsCards";
import { TopSellingCard } from "@/pages/admin/dashboard/components/TopSellingCard";
import { RushHourChart } from "@/pages/admin/dashboard/components/RushHourChart";
import { PaymentModal } from "@/pages/admin/dashboard/components/PaymentModal";
import { BillPrintSheet } from "@/pages/admin/dashboard/components/BillPrintSheet";
import { ActivityFeed } from "@/pages/admin/dashboard/components/ActivityFeed";
import { UnpaidBillsCard } from "@/pages/admin/dashboard/components/UnpaidBillsCard";
import { ActiveStaffCard } from "@/pages/admin/dashboard/components/ActiveStaffCard";
import { DashboardStatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

const getOperationalRange = () => {
  const now = new Date();
  const shiftStart = startOfDay(now);
  const shiftEnd = endOfDay(now);

  return { shiftStart, shiftEnd, now };
};

// Import helper
import { startOfDay, endOfDay } from 'date-fns';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
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

  const [payment, setPayment] = React.useState<any>(null);
  const [billOrder, setBillOrder] = React.useState<any>(null);
  const [now, setNow] = React.useState(new Date());

  // Initial Fetch & Realtime Subscription
  React.useEffect(() => {
    const { shiftStart, shiftEnd } = getOperationalRange();

    fetchOrders({
      from_date: shiftStart.toISOString(),
      to_date: shiftEnd.toISOString(),
      limit: 100
    });

    fetchProducts();
    fetchStats();
    fetchRevenue();

    const restaurantId = user?.allowed_restaurant_ids?.[0];
    if (restaurantId) {
      subscribeToOrders(restaurantId);
    }

    const clockId = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(clockId);
      unsubscribe();
    };
  }, [fetchOrders, fetchProducts, fetchStats, fetchRevenue, subscribeToOrders, unsubscribe, user]);

  // Derived Data for the current shift
  const shiftOrders = React.useMemo(() => {
    const { shiftStart, shiftEnd } = getOperationalRange();
    return (orders || []).filter(o => {
      const placedAt = new Date(o.placed_at);
      return placedAt >= shiftStart && placedAt <= shiftEnd;
    });
  }, [orders]);

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
    const seq = Array.from({ length: 24 }, (_, i) => i);
    return seq.map(h => {
      const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
      return { hour: label, orders: counts[h] };
    });
  }, [shiftOrders]);

  const handleNewOrder = () => {
    navigate(`/manager/orders?new=true`);
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
    <div className="container py-4 space-y-6 max-w-7xl mx-auto pb-20 no-scrollbar">
      {/* Page Title Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="flex items-center gap-3 mb-1 px-1">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase tracking-tighter">Manager Hub</h1>
          </div>
          <div className="px-1 flex flex-col">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
              {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <Button
            onClick={handleNewOrder}
            className="h-11 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 transition-all shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </motion.div>

      <OrderStatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <ActivityFeed />
          <ActiveStaffCard />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Channels Card Hidden for Manager */}
          <div className="grid gap-6 md:grid-cols-1">
            <UnpaidBillsCard />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TopSellingCard data={topSellingData} products={products} />
            <RushHourChart data={rushHourData} />
          </div>
        </div>
      </div>

      <PaymentModal order={payment} onClose={() => setPayment(null)} />
      <BillPrintSheet order={billOrder} onOpenChange={(o) => !o && setBillOrder(null)} />
    </div>
  );
}
