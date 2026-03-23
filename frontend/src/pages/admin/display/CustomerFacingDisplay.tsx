/**
 * Customer-Facing Display (CFD)
 * Fullscreen view for a secondary screen at the counter.
 * Shows the most recent active/paid order in real-time.
 */
import * as React from "react";
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useAdminOrdersStore } from "@/stores/orders";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { apiClient } from "@/lib/api-client";
import { formatINR } from "@/lib/format";
import type { Order } from "@/types/order";
import { CheckCircle2, Clock, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Order Received",
  PREPARING: "Being Prepared",
  READY: "Ready for Pickup",
  COMPLETED: "Completed",
  ACTIVE: "Order in Progress",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-400",
  PREPARING: "text-blue-400",
  READY: "text-emerald-400",
  COMPLETED: "text-emerald-500",
  ACTIVE: "text-blue-400",
};

export default function CustomerFacingDisplay() {
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  const subscribeToRestaurantOrders = useRealtimeStore((s) => s.subscribeToRestaurantOrders);
  const [currentOrder, setCurrentOrder] = React.useState<Order | null>(null);
  const [now, setNow] = React.useState(new Date());

  React.useEffect(() => {
    if (!restaurant) fetchRestaurant();
  }, [restaurant, fetchRestaurant]);

  // Load latest active order on mount
  React.useEffect(() => {
    if (!restaurant?.id) return;
    apiClient
      .get<any>("/orders?status=ACTIVE,PREPARING,READY&limit=1&sort=placed_at_desc")
      .then((res) => {
        const orders: Order[] = (res.data as any)?.data ?? [];
        if (orders.length > 0) setCurrentOrder(orders[0]);
      })
      .catch(() => {});
  }, [restaurant?.id]);

  // Subscribe to realtime order updates
  React.useEffect(() => {
    if (!restaurant?.id) return;
    const unsub = subscribeToRestaurantOrders(restaurant.id, (update) => {
      if (update.type === "ORDER_UPDATED" || update.type === "ORDER_CREATED") {
        const order = update.order as unknown as Order;
        if (order && ["ACTIVE", "PREPARING", "READY", "PENDING"].includes(order.status)) {
          setCurrentOrder(order);
        } else if (order?.status === "COMPLETED" || order?.status === "CANCELLED") {
          // Keep showing for a moment then clear
          setCurrentOrder((prev) => prev?.id === order.id ? order : prev);
          setTimeout(() => setCurrentOrder((prev) => prev?.id === order.id ? null : prev), 5000);
        }
      }
    });
    return unsub;
  }, [restaurant?.id, subscribeToRestaurantOrders]);

  // Clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const subtotal = currentOrder ? parseFloat(currentOrder.total_amount) : 0;
  const discount = currentOrder?.discount_amount ? parseFloat(currentOrder.discount_amount as string) : 0;
  const tip = currentOrder?.tip_amount ? parseFloat(currentOrder.tip_amount as string) : 0;
  const total = subtotal - discount + tip;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Utensils className="w-6 h-6 text-primary" />
          <span className="text-xl font-black uppercase tracking-widest text-white">
            {restaurant?.name || "Restaurant"}
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-white tabular-nums">
            {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {!currentOrder ? (
          // Idle state
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full border-4 border-slate-700 flex items-center justify-center mx-auto animate-pulse">
              <Utensils className="w-12 h-12 text-slate-600" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-300">Welcome</p>
              {restaurant?.tagline && (
                <p className="text-slate-500 mt-2 italic">{restaurant.tagline}</p>
              )}
            </div>
          </div>
        ) : (
          // Order display
          <div className="w-full max-w-2xl mx-auto space-y-6">
            {/* Order status */}
            <div className="text-center space-y-2">
              <div className={cn("text-lg font-black uppercase tracking-widest", STATUS_COLORS[currentOrder.status] ?? "text-white")}>
                {STATUS_LABELS[currentOrder.status] ?? currentOrder.status}
              </div>
              <div className="text-6xl font-black text-white">
                #{currentOrder.order_number || currentOrder.id.slice(0, 6).toUpperCase()}
              </div>
              {currentOrder.customer_name && (
                <div className="text-xl text-slate-300 font-semibold">{currentOrder.customer_name}</div>
              )}
            </div>

            {/* Items */}
            <div className="bg-slate-900 rounded-2xl p-6 space-y-4">
              <div className="flex text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-3">
                <span className="flex-1">Item</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-hidden">
                {currentOrder.items.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <span className="flex-1 font-semibold text-slate-200 truncate">{item.name_snapshot}</span>
                    <span className="w-10 text-center font-black text-slate-400">{item.quantity}</span>
                    <span className="w-24 text-right font-black text-white">
                      {formatINR(parseFloat(item.price_snapshot) * item.quantity)}
                    </span>
                  </div>
                ))}
                {currentOrder.items.length > 8 && (
                  <div className="text-xs text-slate-500 text-center">+{currentOrder.items.length - 8} more items</div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
              {discount > 0 && (
                <div className="flex justify-between text-slate-400 text-sm font-semibold">
                  <span>Discount</span>
                  <span className="text-emerald-400">- {formatINR(discount)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between text-slate-400 text-sm font-semibold">
                  <span>Tip</span>
                  <span>{formatINR(tip)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline border-t border-slate-700 pt-3">
                <span className="text-xl font-black text-slate-300 uppercase tracking-tight">Total Payable</span>
                <span className="text-4xl font-black text-white">{formatINR(total)}</span>
              </div>
              {currentOrder.payment_status === "PAID" && (
                <div className="flex items-center justify-center gap-2 pt-2 text-emerald-400 font-black text-lg">
                  <CheckCircle2 className="w-6 h-6" />
                  PAID — Thank You!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Powered by Eat · N · Bill
        </p>
      </div>
    </div>
  );
}
