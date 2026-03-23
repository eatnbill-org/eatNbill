/**
 * Captain Order App Mode — stripped-down mobile UI for senior waiters/captains
 * Focuses on: Tables (floor plan) → New Order → Active Orders
 * Optimized for phone use with large touch targets
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useStaffAuth } from "@/hooks/use-head-auth";
import { useRealtimeStore, type QROrderPayload } from "@/stores/realtime/realtime.store";
import { useNotificationStore } from "@/stores/notifications.store";
import { playOrderSound } from "@/lib/sound-notification";
import { fetchOrderById } from "@/lib/head-api";
import QROrderNotification from "@/components/QROrderNotification";
import {
  LayoutGrid,
  UtensilsCrossed,
  ClipboardList,
  LogOut,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const NAV_ITEMS = [
  { to: "/captain/tables", label: "Tables", icon: LayoutGrid },
  { to: "/captain/orders", label: "Orders", icon: ClipboardList },
  { to: "/captain/menu", label: "New Order", icon: UtensilsCrossed },
];

export default function CaptainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staff, restaurant, logout } = useStaffAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const subscribeToRestaurantOrders = useRealtimeStore((s) => s.subscribeToRestaurantOrders);
  const notifiedQrOrderIds = useRef<Set<string>>(new Set());

  // Swipe navigation
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleSwipeTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeTouchStart.current.y;
    swipeTouchStart.current = null;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 60) return;
    const navPaths = NAV_ITEMS.map(n => n.to);
    const currentIdx = navPaths.findIndex(p => location.pathname.startsWith(p));
    if (dx < 0 && currentIdx < navPaths.length - 1) navigate(navPaths[currentIdx + 1]);
    if (dx > 0 && currentIdx > 0) navigate(navPaths[currentIdx - 1]);
  }, [location.pathname, navigate]);

  // QR order notifications
  const handleQrNotification = useCallback(async (
    orderId: string,
    fallback?: Partial<{ order_number: string; customer_name: string; table_number: string; total_amount: number }>
  ) => {
    if (!orderId || notifiedQrOrderIds.current.has(orderId)) return;
    notifiedQrOrderIds.current.add(orderId);
    playOrderSound("QR");
    try {
      const response = await fetchOrderById(orderId);
      const fullOrder = response?.data;
      if (fullOrder?.id) { useNotificationStore.getState().addNotification(fullOrder); return; }
    } catch {}
    useNotificationStore.getState().addNotification({
      id: orderId,
      order_number: fallback?.order_number || orderId.slice(0, 8),
      customer_name: fallback?.customer_name || "Guest",
      table_number: fallback?.table_number || null,
      total_amount: fallback?.total_amount || 0,
    } as any);
  }, []);

  // Realtime
  useEffect(() => {
    if (!restaurant?.id) return;
    const unsub = subscribeToRestaurantOrders(restaurant.id, (update: QROrderPayload) => {
      queryClient.invalidateQueries({ queryKey: ["staff-orders"] });
      queryClient.invalidateQueries({ queryKey: ["head-orders-for-tables"] });
      if (update?.source === "QR" && update?.orderId) {
        void handleQrNotification(update.orderId, update);
      }
    });
    return unsub;
  }, [restaurant?.id, subscribeToRestaurantOrders, queryClient, handleQrNotification]);

  const handleLogout = async () => {
    try { await logout(); toast.success("Logged out"); navigate("/auth/login"); }
    catch { toast.error("Logout failed"); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Compact Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-xl">
              <ChefHat className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-none">Captain Mode</p>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">{staff?.name || restaurant?.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-9 px-3 gap-1.5"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto pb-24"
        onTouchStart={handleSwipeTouchStart}
        onTouchEnd={handleSwipeTouchEnd}
      >
        <div className="max-w-lg mx-auto p-3">
          <Outlet />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pt-2 pb-6 px-2 z-40 backdrop-blur-xl bg-white/95 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 min-w-[72px] py-1 rounded-2xl transition-all ${
                  isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div className={`p-2 rounded-2xl transition-all ${isActive ? "bg-primary/10" : "bg-transparent"}`}>
                  <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5px]" : ""}`} />
                </div>
                <span className="text-[10px] font-bold">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* QR Notifications */}
      <QROrderNotification />

      {/* Logout Dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-xs rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center">Exit Captain Mode?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Log Out
            </Button>
            <Button variant="outline" onClick={() => setLogoutOpen(false)} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
