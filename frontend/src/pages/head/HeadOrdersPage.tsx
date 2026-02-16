/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom"; // For menu page redirect
import { useRealtimeStore, type QROrderPayload } from "@/stores/realtime/realtime.store";
import { useNotificationStore } from "@/stores/notifications.store";
import { useHeadAuth } from "@/hooks/use-head-auth";
import { fetchStaffOrders, fetchProducts, addOrderItems, updateOrderItem, removeOrderItem, acceptQROrder, rejectQROrder } from "@/lib/staff-api";
import { formatINR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";
import { QROrderNotificationContainer } from "@/components/orders/QROrderNotification";
import { playOrderSound, type OrderSource } from '@/lib/sound-notification';

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

    // Reorder dialog state
    const [reorderDialogOpen, setReorderDialogOpen] = React.useState(false);
    const [reorderCart, setReorderCart] = React.useState<Record<string, number>>({});
    const [showConfirmation, setShowConfirmation] = React.useState(false); // 🟢 Confirmation dialog

    // Order Details Dialog State
    const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = React.useState("");

    // QR Order notification state
    const [pendingQROrders, setPendingQROrders] = React.useState<QROrderPayload[]>([]);

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
                
                // Play notification sound for new orders
                if (update?.eventType === 'INSERT' && update?.order) {
                    const orderSource = update.order.source as OrderSource;
                    
                    console.log('[HeadOrdersPage] New order detected - Source:', orderSource);
                    
                    // Map order source to sound notification
                    let soundType: 'QR' | 'TAKEAWAY' | 'ZOMATO' | 'SWIGGY' = 'TAKEAWAY';
                    
                    switch (orderSource) {
                        case 'QR':
                            soundType = 'QR';
                            break;
                        case 'ZOMATO':
                            soundType = 'ZOMATO';
                            break;
                        case 'SWIGGY':
                            soundType = 'SWIGGY';
                            break;
                        case 'TAKEAWAY':
                        case 'WEB':
                        case 'MANUAL':
                        default:
                            soundType = 'TAKEAWAY';
                            break;
                    }
                    
                    console.log('[HeadOrdersPage] Playing sound:', soundType);
                    
                    // Play the appropriate sound
                    playOrderSound(soundType);
                    
                    // Show toast notification
                    const orderNumber = update.order.order_number || 'New';
                    const customerName = update.order.customer_name || 'Customer';
                    toast.success(`New ${orderSource} order #${orderNumber} from ${customerName}`, {
                        duration: 4000,
                    });
                }
                
                // Invalidate and refetch orders when any change happens
                queryClient.invalidateQueries({ queryKey: ['staff-orders'] });

                // Trigger QR notification popup for new QR orders
                if (update?.eventType === 'INSERT' && update?.order?.source === 'QR') {
                    useNotificationStore.getState().addNotification(update.order);
                }
            }
        );

        return () => {
            console.log('[HeadOrdersPage] Cleaning up realtime subscription');
            if (unsubscribe) unsubscribe();
        };
    }, [restaurant?.id, queryClient]);

    // Subscribe to pending QR orders
    React.useEffect(() => {
        if (!restaurant?.id) return;

        const unsubscribe = useRealtimeStore.getState().subscribeToPendingOrders(
            restaurant.id,
            (payload: QROrderPayload) => {
                console.log('[HeadOrdersPage] New QR order:', payload);
                
                // Play notification sound for QR orders
                playOrderSound('QR');
                
                toast.info(`New order #${payload.order_number} from Table ${payload.table_number}`);
                
                // Add to pending orders list
                setPendingQROrders((prev) => [...prev, payload]);

                // Also invalidate orders query to refresh the list
                queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            }
        );

        return () => {
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

    // Fetch products for reorder dialog
    const { data: productsResponse } = useQuery({
        queryKey: ['staff-products'],
        queryFn: fetchProducts,
        enabled: reorderDialogOpen,
    });

    const orders = ordersResponse?.data || [];
    const products = productsResponse?.products || [];
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
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((o: any) =>
                o.order_number?.toLowerCase().includes(q) ||
                o.customer_name?.toLowerCase().includes(q) ||
                o.customer_phone?.includes(q) ||
                getOrderTableNumber(o)?.toLowerCase().includes(q) ||
                o.total_amount?.toString().includes(q)
            );
        }

        // Sort by updated_at descending (new/updated orders first)
        return result.sort((a: any, b: any) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [orders, statusFilter, searchQuery, getOrderTableNumber]);

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

    // Reorder mutation with optimistic updates
    const reorderMutation = useMutation({
        mutationFn: ({ orderId, items }: { orderId: string; items: Array<{ product_id: string; quantity: number }> }) =>
            addOrderItems(orderId, items),
        // 🟡 Important Fix: Optimistic update for instant UI feedback
        onMutate: async (variables) => {
            // Cancel outgoing refetches to prevent overwriting optimistic update
            await queryClient.cancelQueries({ queryKey: ['staff-orders'] });

            // Snapshot previous value for rollback
            const previousOrders = queryClient.getQueryData(['staff-orders']);

            // Optimistically update UI
            queryClient.setQueryData(['staff-orders'], (old: any) => {
                if (!old?.data) return old;

                return {
                    ...old,
                    data: old.data.map((order: any) => {
                        if (order.id === variables.orderId) {
                            // Calculate new total
                            const newItemsTotal = variables.items.reduce((sum, item) => {
                                const product = products.find((p: any) => p.id === item.product_id);
                                return sum + (product ? product.price * item.quantity : 0);
                            }, 0);

                            return {
                                ...order,
                                total_amount: Number(order.total_amount) + newItemsTotal,
                            };
                        }
                        return order;
                    })
                };
            });

            return { previousOrders };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            setReorderDialogOpen(false);
            setReorderCart({});
            setSelectedOrder(null);
            toast.success('Items added to order!');
        },
        onError: (error: any, variables, context) => {
            // Rollback on error
            if (context?.previousOrders) {
                queryClient.setQueryData(['staff-orders'], context.previousOrders);
            }
            toast.error(error.message || 'Failed to add items');
        }
    });

    // Accept QR order mutation
    const acceptOrderMutation = useMutation({
        mutationFn: ({ orderId, isAutoAccept }: { orderId: string; isAutoAccept?: boolean }) => 
            acceptQROrder(orderId, restaurant?.id),
        onSuccess: (data, { orderId, isAutoAccept }) => {
            // Remove from pending orders immediately
            setPendingQROrders((prev) => prev.filter((order) => order.order_id !== orderId));
            
            // Refresh orders list with refetch to ensure it updates
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            queryClient.refetchQueries({ queryKey: ['staff-orders'] });
            
            // Only show toast for manual accepts, not auto-accepts
            if (!isAutoAccept) {
                toast.success('Order accepted successfully');
            }
        },
        onError: (error: any, { isAutoAccept }) => {
            // Don't show error toast for auto-accepts to avoid confusion
            if (!isAutoAccept) {
                toast.error(error.message || 'Failed to accept order');
            }
        },
    });

    // Reject QR order mutation
    const rejectOrderMutation = useMutation({
        mutationFn: (orderId: string) => rejectQROrder(orderId, 'Rejected by staff', restaurant?.id),
        onSuccess: (data, orderId) => {
            // Remove from pending orders immediately
            setPendingQROrders((prev) => prev.filter((order) => order.order_id !== orderId));
            
            // Refresh orders list with refetch to ensure it updates
            queryClient.invalidateQueries({ queryKey: ['staff-orders'] });
            queryClient.refetchQueries({ queryKey: ['staff-orders'] });
            
            toast.success('Order rejected');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to reject order');
        },
    });

    // 🟢 Nice to Have: Show confirmation before adding items
    const handleReorder = () => {
        if (!selectedOrder) return;

        const items = Object.entries(reorderCart)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({
                product_id: productId,
                quantity,
            }));

        if (items.length === 0) {
            toast.error('Please select at least one item');
            return;
        }

        // Show confirmation dialog
        setShowConfirmation(true);
    };

    const confirmAddItems = () => {
        if (!selectedOrder) return;

        const items = Object.entries(reorderCart)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({
                product_id: productId,
                quantity,
            }));

        setShowConfirmation(false);
        reorderMutation.mutate({ orderId: selectedOrder.id, items });
    };

    const addToReorder = (productId: string) => {
        setReorderCart((c) => ({ ...c, [productId]: (c[productId] ?? 0) + 1 }));
    };

    const decFromReorder = (productId: string) => {
        setReorderCart((c) => {
            const next = { ...c };
            const v = (next[productId] ?? 0) - 1;
            if (v <= 0) delete next[productId];
            else next[productId] = v;
            return next;
        });
    };

    const reorderTotal = Object.entries(reorderCart).reduce((sum, [productId, qty]) => {
        const p = products.find((prod: any) => prod.id === productId);
        return sum + (p ? p.price * qty : 0);
    }, 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Controls: Search (Left) & Filter (Right) */}
            <div className="sticky top-0 bg-slate-50 z-20 py-3 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="mb-2 flex items-center gap-2">
                    {realtimeConnected ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            Live
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Syncing (5s)
                        </span>
                    )}
                </div>
                <div className="flex flex-row items-center gap-3">
                    {/* Left: Search Bar */}
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search Order #, Name, Phone..."
                            className="pl-10 h-11 bg-white border-slate-200 focus:border-primary focus:ring-primary/20 rounded-xl transition-all shadow-sm font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Right: Filter Dropdown */}
                    <div className="w-40 md:w-48 shrink-0">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl focus:ring-primary/20 shadow-sm font-bold text-slate-700">
                                <SelectValue placeholder="Filter" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-xl" align="end">
                                <SelectItem value="all" className="font-medium text-slate-600">All Orders</SelectItem>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <SelectItem key={key} value={key} className="focus:bg-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2 w-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                                            {config.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Orders Grid */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm animate-in fade-in zoom-in duration-500">
                    <div className="bg-primary/10 p-6 rounded-full mb-6">
                        <UtensilsCrossed className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No orders found</h3>
                    <p className="text-slate-500 text-sm max-w-sm text-center font-medium">
                        {searchQuery ? "Try adjusting your search terms or filters" : "There are no active orders at the moment."}
                    </p>
                    {searchQuery && (
                        <Button variant="link" onClick={() => setSearchQuery("")} className="text-primary font-bold mt-2">
                            Clear Filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pb-24">
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
                                            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-3 rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold"
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
                                                    Add Items
                                                </Button>
                                            )}
                                            {order.payment_status !== 'PAID' && order.status !== 'CANCELLED' && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(order);
                                                        setPaymentDialogOpen(true);
                                                    }}
                                                >
                                                    <IndianRupee className="h-3.5 w-3.5 mr-1" />
                                                    Mark Paid
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

            {/* Order Details Modal - Enhanced & Responsive */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl p-0 gap-0 border-0 shadow-2xl">
                    {selectedOrder && (
                        <>
                            {/* Modal Header */}
                            <DialogHeader className="p-5 md:p-6 pb-4 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white sticky top-0 z-10">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                    <div>
                                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                                            Order #{selectedOrder.order_number}
                                            {selectedOrder.payment_status === 'PAID' && (
                                                <Badge className="bg-green-500 text-white hover:bg-green-600 border-0 h-6 px-2">PAID</Badge>
                                            )}
                                        </DialogTitle>
                                        <p className="text-xs text-slate-500 font-medium mt-1">{formatDateTime(selectedOrder.created_at)}</p>
                                    </div>
                                    <Badge className={`${STATUS_CONFIG[selectedOrder.status]?.bgColor} ${STATUS_CONFIG[selectedOrder.status]?.color} border-0 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 w-fit`}>
                                        {STATUS_CONFIG[selectedOrder.status]?.icon}
                                        {STATUS_CONFIG[selectedOrder.status]?.label}
                                    </Badge>
                                </div>
                            </DialogHeader>

                            {/* Modal Body - Scrollable */}
                            <div className="overflow-y-auto max-h-[calc(92vh-180px)] p-5 md:p-6 space-y-5">
                                {/* Customer & Location Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Customer Card */}
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-blue-600" />
                                            <p className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">Customer</p>
                                        </div>
                                        <p className="font-bold text-slate-900 text-base truncate">{selectedOrder.customer_name || 'Guest'}</p>
                                        <p className="text-sm text-slate-600 truncate mt-0.5">{selectedOrder.customer_phone || 'No phone'}</p>
                                    </div>

                                    {/* Location Card */}
                                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="h-4 w-4 text-orange-600" />
                                            <p className="text-[10px] uppercase tracking-wider text-orange-700 font-bold">Location</p>
                                        </div>
                                        <p className="font-bold text-slate-900 text-base">
                                            {selectedOrder.order_type === 'DINE_IN'
                                                ? `Table ${getOrderTableNumber(selectedOrder) || 'N/A'}${getOrderHallName(selectedOrder) ? ` - ${getOrderHallName(selectedOrder)}` : ''}`
                                                : 'Takeaway'}
                                        </p>
                                        <p className="text-sm text-slate-600 mt-0.5">{selectedOrder.source || 'In-House'}</p>
                                    </div>
                                </div>

                                {/* Special Notes */}
                                {selectedOrder.notes && (
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex gap-3">
                                        <div className="text-2xl">📝</div>
                                        <div className="flex-1">
                                            <p className="text-xs text-amber-900 font-bold uppercase mb-1">Special Instructions</p>
                                            <p className="text-sm text-amber-800 leading-relaxed">"{selectedOrder.notes}"</p>
                                        </div>
                                    </div>
                                )}

                                {/* Order Items */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Utensils className="h-4 w-4 text-slate-500" />
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Order Items</h3>
                                    </div>
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                        <div className="max-h-64 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100 sticky top-0 z-10">
                                                    <tr className="border-b border-slate-200">
                                                        <th className="text-left py-3 px-4 font-bold text-slate-700">Item</th>
                                                        <th className="text-center py-3 px-3 font-bold text-slate-700 w-16">Qty</th>
                                                        <th className="text-right py-3 px-4 font-bold text-slate-700 w-24">Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white">
                                                    {selectedOrder.items?.slice()
                                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                        .map((item: any) => (
                                                            <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                                <td className="py-3 px-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-semibold text-slate-900">{item.name_snapshot || item.product?.name || 'Item'}</p>
                                                                    </div>
                                                                    {item.notes && <p className="text-xs text-slate-500 italic mt-0.5">Note: {item.notes}</p>}
                                                                </td>
                                                                <td className="py-3 px-3 text-center">
                                                                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold rounded-lg px-2 py-1 text-sm min-w-[2rem]">
                                                                        {item.quantity}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                                                                    {formatINR(item.quantity * (item.price_snapshot || item.unit_price || 0))}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Total */}
                                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t-2 border-orange-200 px-4 py-4">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-700 text-base">Total Amount</span>
                                                <span className="font-black text-2xl text-orange-600 tracking-tight">{formatINR(selectedOrder.total_amount)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer - Action Buttons */}
                            <div className="p-5 md:p-6 border-t border-slate-200 bg-slate-50 space-y-3 sticky bottom-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Add More Items Button */}
                                    {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                                        <Button
                                            variant="outline"
                                            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl h-11 font-semibold"
                                            onClick={() => {
                                                if (selectedOrder.payment_status === 'PAID') {
                                                    toast.error('Cannot add items to a paid order');
                                                    return;
                                                }
                                                const tableId = selectedOrder.table_id || 'TAKEAWAY';
                                                navigate(`/head/menu/${selectedOrder.id}?table=${tableId}`);
                                                setDetailsDialogOpen(false);
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add More Items
                                        </Button>
                                    )}

                                    {/* Mark Paid Button */}
                                    {selectedOrder.payment_status !== 'PAID' && selectedOrder.status !== 'CANCELLED' && (
                                        <Button
                                            className="bg-slate-900 hover:bg-black text-white rounded-xl h-11 font-bold shadow-lg"
                                            onClick={() => {
                                                setPaymentDialogOpen(true);
                                            }}
                                        >
                                            <IndianRupee className="h-4 w-4 mr-2" />
                                            Mark Paid
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

            {/* Reorder Dialog - Keep as is but style better? */}
            <Dialog open={reorderDialogOpen} onOpenChange={setReorderDialogOpen}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-3xl p-0 gap-0">
                    <DialogHeader className="p-4 bg-orange-50 border-b border-orange-100">
                        <DialogTitle className="text-orange-900">Add Items</DialogTitle>
                        <p className="text-xs text-orange-700 font-medium">
                            Adding to order #{selectedOrder?.order_number}
                        </p>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                        {products.filter((p: any) => p.is_active).map((product: any) => {
                            const qty = reorderCart[product.id] ?? 0;

                            return (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${qty > 0 ? 'bg-white border-orange-200 shadow-md transform scale-[1.01]' : 'bg-white border-slate-100 shadow-sm'}`}
                                >
                                    <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                        {product.images?.[0]?.public_url ? (
                                            <img src={product.images[0].public_url} alt={product.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <Utensils className="h-5 w-5 m-auto text-slate-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate text-sm">{product.name}</p>
                                        <p className="text-xs text-orange-600 font-bold">{formatINR(product.price)}</p>
                                    </div>

                                    {qty === 0 ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="shrink-0 h-9 w-9 p-0 rounded-xl border-slate-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                                            onClick={() => addToReorder(product.id)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2 shrink-0 bg-slate-900 rounded-xl p-1 text-white shadow-lg">
                                            <button className="h-7 w-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors" onClick={() => decFromReorder(product.id)}>−</button>
                                            <span className="w-4 text-center font-bold text-sm">{qty}</span>
                                            <button className="h-7 w-7 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors" onClick={() => addToReorder(product.id)}>+</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                        {/* 🟢 Nice to Have: Discount Warning */}
                        {reorderTotal > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                <div className="text-amber-600 mt-0.5">ℹ️</div>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <strong>Note:</strong> Current prices will be applied. Prices may differ from the original order if discounts have changed.
                                </p>
                            </div>
                        )}

                        {/* Order Summary */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Current Order Total</span>
                                <span className="font-semibold text-slate-700">{formatINR(selectedOrder?.total_amount || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">New Items Total</span>
                                <span className="font-bold text-orange-600">{formatINR(reorderTotal)}</span>
                            </div>
                            <div className="h-px bg-slate-200"></div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">Updated Grand Total</span>
                                <span className="font-black text-xl text-orange-600">
                                    {formatINR((selectedOrder?.total_amount || 0) + reorderTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setReorderDialogOpen(false);
                                    setReorderCart({});
                                }}
                                className="flex-1 rounded-xl h-11 border-slate-200"
                                disabled={reorderMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-orange-600 hover:bg-orange-700 rounded-xl h-11 font-bold shadow-lg shadow-orange-200"
                                disabled={reorderTotal === 0 || reorderMutation.isPending}
                                onClick={handleReorder}
                            >
                                {reorderMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                {reorderMutation.isPending ? 'Adding...' : 'Confirm Add'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* 🟢 Nice to Have: Confirmation Dialog */}
            <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <DialogContent className="max-w-md rounded-3xl p-0 gap-0">
                    <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-orange-100">
                        <DialogTitle className="text-xl font-black text-orange-900 flex items-center gap-2">
                            <div className="bg-orange-500 text-white rounded-full p-2">
                                <Plus className="h-5 w-5" />
                            </div>
                            Confirm Add Items
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 space-y-4">
                        <p className="text-slate-700 leading-relaxed">
                            You are about to add <strong className="text-orange-600">{Object.values(reorderCart).reduce((a, b) => a + b, 0)} item(s)</strong> to order <strong>#{selectedOrder?.order_number}</strong>.
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Current Total:</span>
                                <span className="font-semibold">{formatINR(selectedOrder?.total_amount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Adding:</span>
                                <span className="font-semibold text-orange-600">+{formatINR(reorderTotal)}</span>
                            </div>
                            <div className="h-px bg-slate-300"></div>
                            <div className="flex justify-between">
                                <span className="font-bold text-slate-900">New Total:</span>
                                <span className="font-black text-lg text-orange-600">
                                    {formatINR((selectedOrder?.total_amount || 0) + reorderTotal)}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 italic">
                            This action cannot be undone. The order total will be updated immediately.
                        </p>
                    </div>

                    <DialogFooter className="p-6 pt-0 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmation(false)}
                            className="flex-1 rounded-xl h-11 border-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmAddItems}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 font-bold shadow-lg"
                        >
                            <Check className="h-4 w-4 mr-2" />
                            Yes, Add Items
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

            {/* QR Order Notification Popups */}
            <QROrderNotificationContainer
                orders={pendingQROrders}
                onAccept={(orderId, isAutoAccept) => acceptOrderMutation.mutate({ orderId, isAutoAccept })}
                onReject={(orderId) => rejectOrderMutation.mutate(orderId)}
            />
        </div>
    );
}
