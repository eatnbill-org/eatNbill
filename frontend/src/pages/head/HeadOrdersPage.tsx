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
    IndianRupee, Plus, RefreshCw, MapPin, Loader2, Search, ArrowRight, User, X,
    Clock,
    UtensilsCrossed,
    Check,
    Utensils
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";

// Simplified Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode; ringClass: string }> = {
    ACTIVE: { label: "Active", color: "text-blue-600", bgColor: "bg-blue-50", icon: <Clock className="h-4 w-4" />, ringClass: "ring-blue-100" },
    COMPLETED: { label: "Completed", color: "text-slate-600", bgColor: "bg-slate-50", icon: <Check className="h-4 w-4" />, ringClass: "ring-slate-100" },
    CANCELLED: { label: "Cancelled", color: "text-rose-600", bgColor: "bg-rose-50", icon: <UtensilsCrossed className="h-4 w-4" />, ringClass: "ring-rose-100" },
};

export default function HeadOrdersPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate(); // For redirecting to menu page
    const connectionMode = useRealtimeStore((state) => state.connectionMode);
    const realtimeConnected = useRealtimeStore((state) => state.isConnected);
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);
    const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
    const [orderToCancel, setOrderToCancel] = React.useState<any | null>(null);
    const [cancelReason, setCancelReason] = React.useState("");

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

        // Sort by updated_at descending (new/updated orders first)
        const sorted = result.sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        // ✅ Cap to 50 items for performance
        return sorted.slice(0, 50);
    }, [orders, statusFilter, headerSearch, getOrderTableNumber]);

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


    return (
        <div className="space-y-4 max-w-7xl mx-auto">


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
                <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pb-24">
                    {filteredOrders.map((order: any) => {
                        const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                        const isPaid = order.payment_status === 'PAID';

                        return (
                            <div
                                key={order.id}
                                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
                                onClick={() => openDetails(order)}
                            >
                                {/* Status Bar */}
                                <div className={`h-1 w-full ${config.color.replace('text-', 'bg-')}`} />

                                {/* Card Content */}
                                <div className="p-4 flex-1 flex flex-col">
                                    {/* Header: Customer Name & Total Amount */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 text-base truncate">
                                                {order.customer_name || 'Guest'}
                                            </h3>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                Order #{order.order_number}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                                                {getOrderLocationLabel(order)}
                                            </p>
                                        </div>
                                        <div className="text-right ml-3">
                                            <p className="text-xl font-bold text-primary tracking-tight">{formatINR(order.total_amount)}</p>
                                            {isPaid && (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-0 px-1.5 h-4 text-[9px] font-bold mt-1">
                                                    PAID
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items Table (Scrollable) */}
                                    <div className="flex-1 mt-3 mb-3">
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50 sticky top-0">
                                                        <tr className="border-b border-slate-200">
                                                            <th className="text-left py-2 px-3 font-semibold text-slate-600">Item</th>
                                                            <th className="text-center py-2 px-2 font-semibold text-slate-600 w-12">Qty</th>
                                                            <th className="text-right py-2 px-3 font-semibold text-slate-600 w-20">Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.items?.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item: any, idx: number) => {
                                                            // Determine effective status
                                                            // If status is "REORDER" or null/undefined, treat as "New" unless order is in advanced state
                                                            let statusLabel = 'New';
                                                            let statusColor = 'bg-blue-100 text-blue-700';

                                                            if (item.status === 'SERVED') {
                                                                statusLabel = 'Served';
                                                                statusColor = 'bg-purple-100 text-purple-700';
                                                            } else if (item.status === 'REORDER') {
                                                                statusLabel = 'New';
                                                                statusColor = 'bg-orange-100 text-orange-700';
                                                            } else if (!item.status || item.status === 'PENDING') {
                                                                // Use order status as fallback if item status is ambiguous
                                                                if (order.status === 'PREPARING') {
                                                                    statusLabel = 'Cook';
                                                                    statusColor = 'bg-orange-100 text-orange-700';
                                                                } else if (order.status === 'READY') {
                                                                    statusLabel = 'Ready';
                                                                    statusColor = 'bg-green-100 text-green-700';
                                                                } else {
                                                                    statusLabel = 'New';
                                                                    statusColor = 'bg-blue-100 text-blue-700';
                                                                }
                                                            }

                                                            return (
                                                                <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                                                    <td className="py-2 px-3 text-slate-700 font-medium truncat">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="truncate max-w-[120px]">{item.name_snapshot || item.product?.name || 'Item'}</span>
                                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${statusColor}`}>
                                                                                {statusLabel}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 px-2 text-center text-slate-600 font-semibold">
                                                                        {item.quantity}
                                                                    </td>
                                                                    <td className="py-2 px-3 text-right text-slate-700 font-semibold tabular-nums">
                                                                        {formatINR(item.quantity * (item.price_snapshot || item.unit_price || 0))}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer: Status Badge & Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                        <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0 px-2.5 py-1 text-[10px] font-bold flex items-center gap-1.5 rounded-lg`}>
                                            {config.icon}
                                            {config.label}
                                        </Badge>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 w-8 p-0 rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50"
                                                title="Quick Reorder"
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
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2.5 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-[10px] font-bold"
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
                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                    Add
                                                </Button>
                                            )}
                                            {order.payment_status !== 'PAID' && order.status !== 'CANCELLED' && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-[10px] font-bold shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                        setPaymentDialogOpen(true);
                                                    }}
                                                >
                                                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                                                    Paid
                                                </Button>
                                            )}
                                            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2.5 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenCancelDialog(order);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Order Details Modal - Enhanced & Compact */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-[calc(100vw-2.5rem)] sm:max-w-md max-h-[90vh] overflow-hidden rounded-[2.5rem] p-0 gap-0 border-0 shadow-2xl mx-auto flex flex-col">
                    {selectedOrder && (
                        <>
                            {/* Modal Header - Compact */}
                            <DialogHeader className="p-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                                            #{selectedOrder.order_number}
                                            {selectedOrder.payment_status === 'PAID' && (
                                                <Badge className="bg-emerald-500 text-white border-0 h-4 px-1.5 text-[8px] font-black">PAID</Badge>
                                            )}
                                        </DialogTitle>
                                        <p className="text-[10px] text-slate-400 font-bold">{formatDateTime(selectedOrder.created_at)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`${STATUS_CONFIG[selectedOrder.status]?.bgColor} ${STATUS_CONFIG[selectedOrder.status]?.color} border-0 px-2 h-6 text-[9px] font-black uppercase tracking-wider`}>
                                            {selectedOrder.status}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-full bg-slate-50 hover:bg-slate-100"
                                            onClick={() => setDetailsDialogOpen(false)}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </DialogHeader>

                            {/* Modal Body - High Density */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                                {/* Compact Info Row */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center gap-2 border border-slate-100/50">
                                        <User className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-xs font-black text-slate-700 truncate">{selectedOrder.customer_name || 'Guest'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center gap-2 border border-slate-100/50">
                                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                                        <span className="text-xs font-black text-slate-700 truncate">
                                            {getOrderLocationLabel(selectedOrder)}
                                        </span>
                                    </div>
                                </div>

                                {/* Order Items Table */}
                                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50/50 border-b border-slate-50">
                                            <tr>
                                                <th className="text-left py-2.5 px-4 font-black text-slate-400 uppercase text-[9px]">Item</th>
                                                <th className="text-center py-2.5 px-2 font-black text-slate-400 uppercase text-[9px] w-12">Qty</th>
                                                <th className="text-right py-2.5 px-4 font-black text-slate-400 uppercase text-[9px] w-20">Sum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedOrder.items?.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((item: any) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-2.5 px-4">
                                                        <p className="font-bold text-slate-800 leading-tight">{item.name_snapshot || item.product?.name || 'Item'}</p>
                                                        {item.notes && <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">{item.notes}</p>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center">
                                                        <span className="font-black text-primary">{item.quantity}</span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-black text-slate-900 tabular-nums">
                                                        {formatINR(item.quantity * (item.price_snapshot || item.unit_price || 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-900 text-white">
                                                <td colSpan={2} className="py-3 px-4 font-black uppercase text-[10px] tracking-widest">Payable</td>
                                                <td className="py-3 px-4 text-right font-black text-base">{formatINR(selectedOrder.total_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Modal Footer - Single Row Actions */}
                            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-12 rounded-2xl border-orange-200 text-orange-600 font-black text-xs uppercase tracking-wider bg-white hover:bg-orange-50"
                                        onClick={() => {
                                            if (selectedOrder.payment_status === 'PAID') {
                                                toast.error('Cannot add items to a paid order');
                                                return;
                                            }
                                            const tableId = selectedOrder.table_id || 'TAKEAWAY';
                                            navigate(`/head/menu/${selectedOrder.id}?table=${tableId}`);
                                        }}
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Reorder
                                    </Button>

                                    {selectedOrder.payment_status !== 'PAID' && selectedOrder.status !== 'CANCELLED' && (
                                        <Button
                                            className="flex-[1.5] h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-200"
                                            onClick={() => setPaymentDialogOpen(true)}
                                        >
                                            <IndianRupee className="h-4 w-4 mr-2" />
                                            Mark Paid
                                        </Button>
                                    )}
                                    {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-12 rounded-2xl border-rose-200 text-rose-600 font-black text-xs uppercase tracking-wider bg-white hover:bg-rose-50"
                                            onClick={() => handleOpenCancelDialog(selectedOrder)}
                                        >
                                            Cancel Order
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <MarkPaidDialog
                order={selectedOrder}
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                    setPaymentDialogOpen(open);
                    if (!open) {
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
                            className="w-full sm:w-auto rounded-xl"
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
        </div>
    );
}
