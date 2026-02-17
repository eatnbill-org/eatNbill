import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, UtensilsCrossed, LogOut, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import QROrderNotification from "@/components/QROrderNotification";
import { useNotificationStore } from "@/stores/notifications.store";
import { useRealtimeStore, type QROrderPayload } from "@/stores/realtime/realtime.store";
import { playOrderSound } from "@/lib/sound-notification";
import { fetchOrderById, fetchStaffOrders } from "@/lib/head-api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useStaffAuth } from "@/hooks/use-head-auth";

import { LayoutGrid, Package } from "lucide-react";

const NAV_ITEMS = [
    { to: "/head/orders", label: "Orders", icon: ClipboardList },
    { to: "/head/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/head/tables", label: "Tables", icon: LayoutGrid },
    { to: "/head/stock", label: "Stock", icon: Package },
];

export default function HeadLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { staff, restaurant, logout } = useStaffAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const connectionMode = useRealtimeStore((state) => state.connectionMode);
    const notifiedQrOrderIds = useRef<Set<string>>(new Set());
    const knownOrderIdsRef = useRef<Set<string>>(new Set());
    const pollingInitializedRef = useRef(false);

    const handleQrNotification = useCallback(async (
        orderId: string,
        fallback?: Partial<{ order_number: string; customer_name: string; table_number: string; total_amount: number }>
    ) => {
        if (!orderId || notifiedQrOrderIds.current.has(orderId)) return;
        notifiedQrOrderIds.current.add(orderId);

        playOrderSound('QR');

        try {
            const response = await fetchOrderById(orderId);
            const fullOrder = response?.data;
            if (fullOrder?.id) {
                useNotificationStore.getState().addNotification(fullOrder);
                return;
            }
        } catch {
            // Fall through to minimal payload.
        }

        useNotificationStore.getState().addNotification({
            id: orderId,
            source: 'QR',
            order_number: fallback?.order_number || orderId.slice(-4).toUpperCase(),
            customer_name: fallback?.customer_name || 'Customer',
            table_number: fallback?.table_number || null,
            total_amount: Number(fallback?.total_amount || 0),
            items: [],
        } as any);

        // Keep head pages in sync immediately when QR notification arrives.
        queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
        queryClient.invalidateQueries({ queryKey: ['head-orders-for-tables'] });
        queryClient.invalidateQueries({ queryKey: ['head-tables-status'] });
        void queryClient.refetchQueries({ queryKey: ['staff-orders'], type: 'active' });
        void queryClient.refetchQueries({ queryKey: ['head-orders-for-tables'], type: 'active' });
    }, [queryClient]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                toast.error(`Error attempting to enable full-screen mode: ${e.message}`);
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Keep state in sync with actual fullscreen status (handles ESC key etc)
    useState(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    useEffect(() => {
        if (!restaurant?.id) return;

        const unsubscribe = useRealtimeStore.getState().subscribeToRestaurantOrders(
            restaurant.id,
            async (update: any) => {
                if (update?.eventType !== 'INSERT' || !update?.order) return;

                // Global waiter popup + sound for customer QR orders on all /head/* pages.
                if (update.order.source === 'QR') {
                    await handleQrNotification(update.order.id, update.order);
                }
            }
        );

        const unsubscribePending = useRealtimeStore.getState().subscribeToPendingOrders(
            restaurant.id,
            async (payload: QROrderPayload) => {
                await handleQrNotification(payload.order_id, payload);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
            if (unsubscribePending) unsubscribePending();
        };
    }, [restaurant?.id, handleQrNotification]);

    useEffect(() => {
        // Reset caches when restaurant context changes.
        notifiedQrOrderIds.current.clear();
        knownOrderIdsRef.current.clear();
        pollingInitializedRef.current = false;
    }, [restaurant?.id]);

    // Fallback: if websocket realtime is down, detect new QR orders from polling data.
    useEffect(() => {
        if (!restaurant?.id || connectionMode !== 'polling') return;

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const pollOrders = async () => {
            try {
                const response = await fetchStaffOrders();
                const orders = Array.isArray(response?.data) ? response.data : [];
                const nextIds = new Set<string>();

                for (const order of orders) {
                    if (!order?.id) continue;
                    nextIds.add(order.id);

                    const isKnown = knownOrderIdsRef.current.has(order.id);
                    const isQr = order.source === 'QR';

                    if (pollingInitializedRef.current && !isKnown && isQr) {
                        await handleQrNotification(order.id, order);
                    }
                }

                knownOrderIdsRef.current = nextIds;
                pollingInitializedRef.current = true;
            } catch {
                // Silent: polling fallback should never block UI.
            }
        };

        void pollOrders();
        intervalId = setInterval(() => {
            void pollOrders();
        }, 5000);

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [restaurant?.id, connectionMode, handleQrNotification]);

    const handleLogout = async () => {
        await logout();
        toast.success("Logged out successfully");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    {/* Left: Restaurant Name */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20 shadow-sm shrink-0">
                            {restaurant?.name?.[0] || 'R'}
                        </div>
                        <div className="hidden sm:block min-w-0">
                            <h1 className="font-bold text-slate-900 text-sm truncate">{restaurant?.name || 'Restaurant'}</h1>
                            <p className="text-[10px] text-slate-500 font-medium">Head Portal</p>
                        </div>
                    </div>

                    {/* Center: Navigation Tabs (Desktop) */}
                    <div className="hidden md:flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 absolute left-1/2 -translate-x-1/2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = location.pathname.includes(item.to);
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${isActive
                                        ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                                        }`}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                                    {item.label}
                                </NavLink>
                            )
                        })}
                    </div>

                    {/* Right: Fullscreen & Logout */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full"
                            onClick={toggleFullScreen}
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize className="h-5 w-5" />
                            ) : (
                                <Maximize className="h-5 w-5" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 pl-2 pr-3"
                            onClick={() => setLogoutOpen(true)}
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="hidden sm:inline font-medium">Logout</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-10 relative bg-slate-50/50">
                <div className="max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pt-2 pb-6 px-6 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] z-40 backdrop-blur-xl bg-white/90">
                <div className="flex items-center justify-around">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname.includes(item.to);
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={`flex flex-col items-center gap-1 min-w-[64px] group ${isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive
                                    ? "bg-primary/10 translate-y-[-6px] shadow-sm ring-4 ring-white"
                                    : "bg-transparent group-hover:bg-slate-50"
                                    }`}>
                                    <Icon className={`h-6 w-6 ${isActive ? "fill-primary/20 stroke-[2.5px]" : ""}`} />
                                </div>
                                <span className={`text-[10px] font-bold transition-all ${isActive ? "translate-y-[-4px]" : ""
                                    }`}>{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>

            {/* Logout Dialog */}
            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
                <DialogContent className="max-w-xs rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">Leaving so soon?</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 flex justify-center">
                        <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                            <LogOut className="h-8 w-8 text-red-500" />
                        </div>
                    </div>
                    <p className="text-center text-sm text-slate-500 mb-4 px-2">
                        Your shift progress will be saved. We'll see you next time!
                    </p>
                    <DialogFooter className="flex-row gap-3">
                        <Button variant="outline" className="flex-1 rounded-xl h-11 border-slate-200" onClick={() => setLogoutOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl h-11 shadow-lg shadow-red-200" onClick={handleLogout}>
                            Logout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Real-time QR Order Notification Popup */}
            <NotificationWrapper />
        </div>
    );
}

function NotificationWrapper() {
    const navigate = useNavigate();
    const { current, dismissNotification } = useNotificationStore();

    const handleViewDetails = (order: any) => {
        // Navigate to orders page
        navigate('/head/orders');
        // Dismiss popup
        dismissNotification();
    };

    return (
        <QROrderNotification
            order={current}
            onDismiss={dismissNotification}
            onViewDetails={handleViewDetails}
            playSound={false}
        />
    );
}
