/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext } from "react-router-dom"; // For menu page redirect
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useHeadAuth } from "@/hooks/use-head-auth";
import { fetchStaffOrders, updateOrderItem, removeOrderItem, updateOrderStatus } from "@/lib/staff-api";
import { formatINR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    IndianRupee, Plus, RefreshCw, MapPin, Loader2, User, X,
    Clock,
    UtensilsCrossed,
    Check,
    Star,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";

// Relative time helper
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Order age in minutes
function orderAgeMinutes(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

// Age-based urgency indicator: green <5m, amber 5-10m, red >10m
function getAgeIndicator(dateStr: string): { cls: string; label: string } | null {
    const mins = orderAgeMinutes(dateStr);
    if (mins < 5) return { cls: "bg-emerald-100 text-emerald-700", label: `${mins}m` };
    if (mins < 10) return { cls: "bg-amber-100 text-amber-700", label: `${mins}m` };
    return { cls: "bg-rose-100 text-rose-700", label: `${mins}m ⚠` };
}

// Status configuration with unique card accent colors
const STATUS_CONFIG: Record<string, {
    label: string; color: string; bgColor: string; icon: React.ReactNode;
    ringClass: string; borderColor: string; cardBg: string; dotColor: string;
    hoverBorder: string; footerBg: string;
}> = {
    ACTIVE: {
        label: "Active", color: "text-emerald-600", bgColor: "bg-emerald-50",
        icon: <Clock className="h-3.5 w-3.5" />, ringClass: "ring-emerald-100",
        borderColor: "border-l-emerald-500", cardBg: "bg-white",
        dotColor: "bg-emerald-500", hoverBorder: "hover:border-emerald-200",
        footerBg: "bg-emerald-50/40",
    },
    COMPLETED: {
        label: "Completed", color: "text-blue-600", bgColor: "bg-blue-50",
        icon: <Check className="h-3.5 w-3.5" />, ringClass: "ring-blue-100",
        borderColor: "border-l-blue-500", cardBg: "bg-slate-50/50",
        dotColor: "bg-blue-500", hoverBorder: "hover:border-blue-200",
        footerBg: "bg-blue-50/40",
    },
    CANCELLED: {
        label: "Cancelled", color: "text-rose-600", bgColor: "bg-rose-50",
        icon: <UtensilsCrossed className="h-3.5 w-3.5" />, ringClass: "ring-rose-100",
        borderColor: "border-l-rose-400", cardBg: "bg-rose-50/20",
        dotColor: "bg-rose-400", hoverBorder: "hover:border-rose-200",
        footerBg: "bg-rose-50/40",
    },
};

export default function HeadOrdersPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate(); // For redirecting to menu page
    const connectionMode = useRealtimeStore((state) => state.connectionMode);
    const realtimeConnected = useRealtimeStore((state) => state.isConnected);
    const [statusFilter, setStatusFilter] = React.useState<string>("ACTIVE");
    const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());
    const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
    const [orderToCancel, setOrderToCancel] = React.useState<any | null>(null);
    const [cancelReason, setCancelReason] = React.useState("");

    // Pull-to-refresh
    const pullTouchStartY = React.useRef<number | null>(null);
    const [pullOffset, setPullOffset] = React.useState(0);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const handlePullTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollTop === 0) {
            pullTouchStartY.current = e.touches[0].clientY;
        }
    }, []);
    const handlePullTouchMove = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (pullTouchStartY.current === null) return;
        const dy = e.touches[0].clientY - pullTouchStartY.current;
        if (dy > 0) setPullOffset(Math.min(dy * 0.4, 64));
    }, []);
    const handlePullTouchEnd = React.useCallback(async () => {
        if (pullOffset >= 40 && !isRefreshing) {
            setIsRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            setIsRefreshing(false);
        }
        setPullOffset(0);
        pullTouchStartY.current = null;
    }, [pullOffset, isRefreshing, queryClient]);

    // Order Details Dialog State
    const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);

    // Search state from layout context
    const { headerSearch } = useOutletContext<{ headerSearch: string }>();

    const { restaurant } = useHeadAuth();

    // Subscribe to realtime updates
    React.useEffect(() => {
        if (!restaurant?.id) return;

        console.log('[HeadOrdersPage] Setting up realtime subscription for restaurant:', restaurant.id);

        // Use centralized realtime store
        const unsubscribe = useRealtimeStore.getState().subscribeToRestaurantOrders(
            restaurant.id,
            (update: any) => {
                console.log('[HeadOrdersPage] Realtime update received:', update);

                // Invalidate and refetch orders when any change happens
                queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            }
        );

        return () => {
            console.log('[HeadOrdersPage] Cleaning up realtime subscription');
            if (unsubscribe) unsubscribe();
        };
    }, [restaurant?.id, queryClient]);

    React.useEffect(() => {
        if (connectionMode === 'realtime') {
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
        }
    }, [connectionMode, queryClient]);

    // Fetch orders from API
    const { data: ordersResponse, isLoading } = useQuery({
        queryKey: ['staff-orders'],
        queryFn: fetchStaffOrders,
        refetchInterval: connectionMode === 'polling' ? 5000 : false,
    });

    const orders = ordersResponse?.data || [];
    const getOrderTableNumber = React.useCallback(
        (order: any) => order?.table?.table_number || order?.table_number || null,
        []
    );
    const getOrderHallName = React.useCallback(
        (order: any) => order?.hall?.name || order?.table?.hall?.name || null,
        []
    );

    // Filter orders
    const filteredOrders = React.useMemo(() => {
        let result = orders;

        // Status Filter
        if (statusFilter !== "all") {
            result = result.filter((o: any) => o.status === statusFilter);
        }

        // Search Filter
        if (headerSearch.trim()) {
            const q = headerSearch.toLowerCase();
            result = result.filter((o: any) =>
                o.order_number?.toLowerCase().includes(q) ||
                o.customer_name?.toLowerCase().includes(q) ||
                o.customer_phone?.includes(q) ||
                getOrderTableNumber(o)?.toLowerCase().includes(q) ||
                o.total_amount?.toString().includes(q)
            );
        }

        // Sort: pinned first, then active orders oldest-first (most urgent), rest newest-first
        const sorted = result.sort((a: any, b: any) => {
            const aPinned = pinnedIds.has(a.id) ? 0 : 1;
            const bPinned = pinnedIds.has(b.id) ? 0 : 1;
            if (aPinned !== bPinned) return aPinned - bPinned;
            // Active orders: oldest (most urgent) first
            if (a.status === 'ACTIVE' && b.status === 'ACTIVE') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

        // ✅ Cap to 50 items for performance
        return sorted.slice(0, 50);
    }, [orders, statusFilter, headerSearch, getOrderTableNumber, pinnedIds]);

    // Active orders count
    const activeOrdersCount = orders.filter((o: any) => o.status === "ACTIVE").length;

    // Active orders count
    // const activeOrdersCount = orders.filter((o: any) => o.status === "ACTIVE").length;

    const updateItemMutation = useMutation({
        mutationFn: ({ orderId, itemId, payload }: { orderId: string; itemId: string; payload: { quantity?: number; notes?: string } }) =>
            updateOrderItem(orderId, itemId, payload),
        onSuccess: (response: any) => {
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            const updatedOrder = response?.data || response;
            if (updatedOrder?.id && selectedOrder?.id === updatedOrder.id) {
                setSelectedOrder(updatedOrder);
            }
            toast.success('Order item updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update item');
        }
    });

    const removeItemMutation = useMutation({
        mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
            removeOrderItem(orderId, itemId),
        onSuccess: (response: any) => {
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            const updatedOrder = response?.data || response;
            if (updatedOrder?.id && selectedOrder?.id === updatedOrder.id) {
                setSelectedOrder(updatedOrder);
            }
            toast.success('Item removed from order');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to remove item');
        }
    });

    const cancelOrderMutation = useMutation({
        mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
            updateOrderStatus(orderId, "CANCELLED", reason),
        onSuccess: () => {
            toast.success("Order cancelled");
            queryClient.invalidateQueries({ queryKey: ["staff-orders"] });
            setCancelDialogOpen(false);
            setCancelReason("");
            setOrderToCancel(null);
            setDetailsDialogOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to cancel order");
        },
    });

    const canEditDineInItems = (order: any) =>
        order?.order_type === 'DINE_IN' &&
        order?.payment_status !== 'PAID' &&
        order?.status !== 'COMPLETED' &&
        order?.status !== 'CANCELLED';

    const handleEditNote = (orderId: string, item: any) => {
        const nextNote = window.prompt('Edit item note', item.notes || '');
        if (nextNote === null) return;
        updateItemMutation.mutate({
            orderId,
            itemId: item.id,
            payload: { notes: nextNote.trim() || undefined },
        });
    };

    // Helper to open details
    const openDetails = (order: any) => {
        setSelectedOrder(order);
        setDetailsDialogOpen(true);
    };

    const getOrderLocationLabel = React.useCallback((order: any) => {
        if (order?.order_type !== "DINE_IN") {
            return order?.order_type === "DELIVERY" ? "Delivery" : "Takeaway";
        }
        const tableNumber = getOrderTableNumber(order);
        const hallName = getOrderHallName(order);
        if (tableNumber && hallName) return `${hallName} • Table ${tableNumber}`;
        if (tableNumber) return `Table ${tableNumber}`;
        if (hallName) return hallName;
        return "Dine-in";
    }, [getOrderHallName, getOrderTableNumber]);

    const handleOpenCancelDialog = React.useCallback((order: any) => {
        setOrderToCancel(order);
        setCancelReason("");
        setCancelDialogOpen(true);
    }, []);

    const handleConfirmCancel = React.useCallback(() => {
        if (!orderToCancel?.id) return;
        cancelOrderMutation.mutate({ orderId: orderToCancel.id, reason: cancelReason.trim() });
    }, [cancelOrderMutation, cancelReason, orderToCancel]);

    const togglePin = React.useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPinnedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);


    return (
        <div
            className="space-y-4 max-w-7xl mx-auto"
            onTouchStart={handlePullTouchStart}
            onTouchMove={handlePullTouchMove}
            onTouchEnd={handlePullTouchEnd}
        >
            {/* Pull-to-refresh indicator */}
            {(pullOffset > 0 || isRefreshing) && (
                <div
                    className="flex items-center justify-center transition-all duration-150"
                    style={{ height: isRefreshing ? 40 : pullOffset, overflow: "hidden" }}
                >
                    <RefreshCw className={`h-5 w-5 text-primary ${isRefreshing ? "animate-spin" : ""}`} style={{ transform: `rotate(${pullOffset * 3}deg)` }} />
                </div>
            )}

            {/* Filter Buttons Row */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${statusFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                        }`}
                >
                    All Orders
                </button>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(key)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm flex items-center gap-2 ${statusFilter === key
                            ? `${config.bgColor} ${config.color} border-2 ${config.color.replace('text-', 'border-')}`
                            : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                            }`}
                    >
                        {config.icon}
                        {config.label}
                    </button>
                ))}
            </div>

            {/* Orders Grid */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm animate-in fade-in zoom-in duration-500">
                    <div className="bg-primary/10 p-6 rounded-full mb-6">
                        <UtensilsCrossed className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No orders found</h3>
                    <p className="text-slate-500 text-sm max-w-sm text-center font-medium">
                        {headerSearch ? "Try adjusting your search terms or filters" : "There are no active orders at the moment."}
                    </p>
                    {headerSearch && (
                        <Button variant="link" onClick={() => navigate('.') /* Need better way to clear layout search? Maybe just mention it */} className="text-primary font-bold mt-2">
                            Clear Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pb-24">
                    {filteredOrders.map((order: any) => {
                        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.ACTIVE;
                        const isPaid = order.payment_status === 'PAID';
                        const tableNum = getOrderTableNumber(order);

                        const isPinned = pinnedIds.has(order.id);
                        const ageIndicator = order.status === 'ACTIVE' ? getAgeIndicator(order.created_at) : null;

                        return (
                            <div
                                key={order.id}
                                className={`group ${config.cardBg} rounded-2xl border ${isPinned ? 'border-amber-200' : 'border-slate-100'} ${config.hoverBorder} shadow-sm hover:shadow-xl transition-all duration-300 ease-out flex overflow-hidden cursor-pointer active:scale-[0.97] select-none border-l-[5px] ${config.borderColor}`}
                                onClick={() => openDetails(order)}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {/* Card Body */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    {/* Row 1: Name + Amount */}
                                    <div className="flex items-start justify-between px-4 pt-3.5 pb-1 gap-3">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {isPinned && <Star className="h-3 w-3 text-amber-400 shrink-0 fill-amber-400" />}
                                            <h3 className="font-extrabold text-slate-900 text-[15px] truncate leading-tight">
                                                {order.customer_name || 'Guest'}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {ageIndicator && (
                                                <span className={`text-[10px] font-black rounded-md px-1.5 py-0.5 ${ageIndicator.cls}`}>
                                                    {ageIndicator.label}
                                                </span>
                                            )}
                                            <p className="text-lg font-extrabold text-emerald-600 tabular-nums whitespace-nowrap tracking-tight leading-tight">
                                                {formatINR(order.total_amount)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 2: Table, Time, Order # */}
                                    <div className="flex items-center gap-2 px-4 pb-2.5 flex-wrap">
                                        {tableNum && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5">
                                                <MapPin className="h-3 w-3 text-slate-400" />
                                                T-{tableNum}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-slate-400 font-semibold">
                                            {timeAgo(order.created_at)}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            #{order.order_number}
                                        </span>
                                        {isPaid && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-md px-1.5 py-0.5">
                                                <Check className="h-2.5 w-2.5" /> Paid
                                            </span>
                                        )}
                                    </div>

                                    {/* Row 3: Item Chips with dietary dots */}
                                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                        {order.items?.slice(0, 5).map((item: any, idx: number) => {
                                            const isVeg = item.product?.is_veg ?? item.is_veg;
                                            return (
                                                <span
                                                    key={idx}
                                                    className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-lg px-2 py-1 transition-colors duration-200 group-hover:bg-slate-200/70"
                                                >
                                                    {isVeg === true && <span className="h-1.5 w-1.5 rounded-sm bg-emerald-500 shrink-0" title="Veg" />}
                                                    {isVeg === false && <span className="h-1.5 w-1.5 rounded-sm bg-rose-500 shrink-0" title="Non-Veg" />}
                                                    {item.quantity}× {item.name_snapshot || item.product?.name || 'Item'}
                                                </span>
                                            );
                                        })}
                                        {order.items?.length > 5 && (
                                            <span className="inline-flex items-center text-[11px] font-bold text-primary bg-primary/10 rounded-lg px-2 py-1">
                                                +{order.items.length - 5} more
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer: Status + Actions */}
                                    <div className={`flex items-center justify-between gap-2 px-4 py-2 ${config.footerBg} border-t border-slate-100/80 mt-auto`}>
                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${config.color}`}>
                                            <span className={`inline-block h-2 w-2 rounded-full ${config.dotColor} animate-pulse`} />
                                            {config.label}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            {/* Pin Button */}
                                            <button
                                                className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border active:scale-90 transition-all duration-150 ${isPinned ? 'text-amber-500 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-slate-400 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
                                                onClick={(e) => togglePin(order.id, e)}
                                                title={isPinned ? 'Unpin order' : 'Pin to top'}
                                            >
                                                <Star className={`h-3.5 w-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                                            </button>

                                            {/* Add Button */}
                                            <button
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-150 shadow-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (order.payment_status === 'PAID') {
                                                        toast.error('Cannot add items to a paid order');
                                                        return;
                                                    }
                                                    const tableId = order.table_id || 'TAKEAWAY';
                                                    navigate(`/head/menu/${order.id}?table=${tableId}`);
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Add
                                            </button>

                                            {/* Paid Button */}
                                            {order.payment_status !== 'PAID' && order.status !== 'CANCELLED' && (
                                                <button
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-emerald-500 rounded-lg px-2.5 py-1.5 hover:bg-emerald-600 active:scale-95 transition-all duration-150 shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                        setPaymentDialogOpen(true);
                                                    }}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                    Paid
                                                </button>
                                            )}

                                            {/* Cancel Button */}
                                            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                                                <button
                                                    className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-rose-400 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 active:scale-90 transition-all duration-150"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenCancelDialog(order);
                                                    }}
                                                    title="Cancel order"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal — Compact Chip Design */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden rounded-2xl p-0 gap-0 border-0 shadow-2xl mx-auto flex flex-col">
                    {selectedOrder && (() => {
                        const mCfg = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.ACTIVE;
                        const mPaid = selectedOrder.payment_status === 'PAID';
                        return (
                            <>
                                {/* Status strip */}
                                <div className={`h-1 w-full shrink-0 ${mCfg.dotColor}`} />

                                {/* Header */}
                                <DialogHeader className={`px-4 pt-3 pb-2.5 border-b border-slate-100 ${mCfg.cardBg} shrink-0`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <DialogTitle className="text-base font-extrabold text-slate-900 truncate leading-tight">
                                                {selectedOrder.customer_name || 'Guest'}
                                            </DialogTitle>
                                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                                                <span className="text-[10px] text-slate-400">#{selectedOrder.order_number}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                                    <MapPin className="h-2.5 w-2.5" />{getOrderLocationLabel(selectedOrder)}
                                                </span>
                                                {mPaid && (
                                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded px-1 py-0.5">
                                                        <Check className="h-2 w-2" /> Paid
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${mCfg.bgColor} ${mCfg.color}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${mCfg.dotColor} animate-pulse`} />
                                                {mCfg.label}
                                            </span>
                                            <button
                                                className="h-6 w-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                                onClick={() => setDetailsDialogOpen(false)}
                                            >
                                                <X className="h-3 w-3 text-slate-500" />
                                            </button>
                                        </div>
                                    </div>
                                </DialogHeader>

                                {/* Body — item chips grouped by course */}
                                <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-3 pb-1 bg-slate-50/50">
                                    {(() => {
                                        const items: any[] = selectedOrder.items ?? [];
                                        const courseOrder = ['STARTER', 'MAIN', 'DESSERT', 'DRINKS'];
                                        const withCourse = items.filter((i: any) => i.course);
                                        const noCourse = items.filter((i: any) => !i.course);
                                        const grouped = courseOrder.reduce((acc: Record<string, any[]>, c) => {
                                            const grp = items.filter((i: any) => i.course === c);
                                            if (grp.length > 0) acc[c] = grp;
                                            return acc;
                                        }, {});
                                        const hasCourses = withCourse.length > 0;

                                        return (
                                            <div className="space-y-3">
                                                {hasCourses && Object.entries(grouped).map(([course, grpItems]) => {
                                                    const allFired = grpItems.every((i: any) => i.course_fired_at);
                                                    return (
                                                        <div key={course} className="space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{course}</span>
                                                                {!allFired && (
                                                                    <button
                                                                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 active:scale-95 transition-all"
                                                                        onClick={async () => {
                                                                            try {
                                                                                const { apiClient } = await import('@/lib/api-client');
                                                                                await apiClient.post(`/orders/${selectedOrder.id}/fire-course/${course}`);
                                                                                queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
                                                                                toast.success(`${course} fired to kitchen`);
                                                                            } catch { toast.error('Failed to fire course'); }
                                                                        }}
                                                                    >
                                                                        🔥 Fire {course}
                                                                    </button>
                                                                )}
                                                                {allFired && <span className="text-[10px] font-bold text-emerald-600">✓ Fired</span>}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(grpItems as any[]).map((item: any, idx: number) => (
                                                                    <div key={item.id || idx} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${mCfg.bgColor} ${mCfg.color} ${item.course_fired_at ? 'opacity-60' : ''}`}>
                                                                        <span className="font-extrabold">{item.quantity}×</span>
                                                                        <span className="truncate max-w-[100px]">{item.name_snapshot || item.product?.name || 'Item'}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {noCourse.length > 0 && (
                                                    <div className={hasCourses ? "pt-1 border-t border-slate-100" : ""}>
                                                        {hasCourses && <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-1.5">Other</span>}
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {noCourse.map((item: any, idx: number) => (
                                                                <div key={item.id || idx} className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${mCfg.bgColor} ${mCfg.color}`}>
                                                                    <span className="font-extrabold">{item.quantity}×</span>
                                                                    <span className="truncate max-w-[100px]">{item.name_snapshot || item.product?.name || 'Item'}</span>
                                                                    <span className="font-extrabold opacity-75 tabular-nums">{formatINR(item.quantity * (item.price_snapshot || item.unit_price || 0))}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    </div>
                                    {/* Total */}
                                    <div className="flex items-center justify-between mt-3 mb-2 px-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total</span>
                                        <span className={`text-lg font-extrabold tabular-nums ${mCfg.color}`}>
                                            {formatINR(selectedOrder.total_amount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="shrink-0 px-3 py-2.5 bg-white border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-xl text-[11px] font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all duration-150 uppercase"
                                            onClick={() => {
                                                if (selectedOrder.payment_status === 'PAID') {
                                                    toast.error('Cannot add items to a paid order');
                                                    return;
                                                }
                                                navigate(`/head/menu/${selectedOrder.id}?table=${selectedOrder.table_id || 'TAKEAWAY'}`);
                                            }}
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add
                                        </button>
                                        {selectedOrder.payment_status !== 'PAID' && selectedOrder.status !== 'CANCELLED' && (
                                            <button
                                                className="flex-[1.5] inline-flex items-center justify-center gap-1 h-9 rounded-xl text-[11px] font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-150 uppercase shadow-sm"
                                                onClick={() => setPaymentDialogOpen(true)}
                                            >
                                                <Check className="h-3.5 w-3.5" /> Mark Paid
                                            </button>
                                        )}
                                        {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                                            <button
                                                className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-xl text-[11px] font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 active:scale-95 transition-all duration-150 uppercase"
                                                onClick={() => handleOpenCancelDialog(selectedOrder)}
                                            >
                                                <X className="h-3.5 w-3.5" /> Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <MarkPaidDialog
                order={selectedOrder}
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                    setPaymentDialogOpen(open);
                    if (!open) {
                        setDetailsDialogOpen(false);
                        queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
                    }
                }}
            />

            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
                    <DialogHeader className="px-6 py-5 border-b border-slate-100">
                        <DialogTitle className="text-lg font-black text-slate-900">Cancel Order</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 py-5 space-y-4">
                        <p className="text-sm text-slate-600">
                            You are cancelling{" "}
                            <span className="font-bold text-slate-900">
                                #{orderToCancel?.order_number || selectedOrder?.order_number}
                            </span>.
                            This action cannot be undone. You can add a reason optionally.
                        </p>
                        <div className="space-y-2">
                            <label htmlFor="cancel-reason" className="text-xs font-black uppercase tracking-wider text-slate-500">
                                Reason (Optional)
                            </label>
                            <Textarea
                                id="cancel-reason"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Reason for cancellation"
                                rows={4}
                                className="rounded-2xl border-slate-200 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            className="w-full sm:w-auto rounded-xl bg-green-600 hover:bg-green-700 text-white"
                            disabled={cancelOrderMutation.isPending}
                        >
                            Keep Order
                        </Button>
                        <Button
                            onClick={handleConfirmCancel}
                            className="w-full sm:w-auto rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                            disabled={cancelOrderMutation.isPending}
                        >
                            {cancelOrderMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                "Confirm Cancel"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Custom Scrollbar Styles */}
            <style>{`
                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .scrollbar-thin::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 10px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .scrollbar-track-slate-100 {
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }
            `}</style>
        </div >
    );
}
