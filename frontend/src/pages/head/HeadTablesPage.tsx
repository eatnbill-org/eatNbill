import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useHeadAuth } from "@/hooks/use-head-auth";
import { fetchTables, fetchStaffOrders } from "@/lib/head-api";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Users,
    Clock,
    Plus,
    Eye,
    ChevronRight,
    RefreshCw,
    MapPin,
    Search,
    User,
    Phone,
    Calendar,
    Receipt,
    Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";

import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";
import { WaiterLayoutSkeleton } from "@/components/ui/skeleton";

export default function HeadTablesPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { restaurant } = useHeadAuth();
    const connectionMode = useRealtimeStore((state) => state.connectionMode);
    // Search state from layout context
    const { headerSearch } = useOutletContext<{ headerSearch: string }>();
    const [selectedTable, setSelectedTable] = React.useState<any | null>(null);
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

    // Subscribe to realtime updates
    React.useEffect(() => {
        if (!restaurant?.id) return;
        const unsubscribe = useRealtimeStore.getState().subscribeToRestaurantOrders(
            restaurant.id,
            () => {
                queryClient.invalidateQueries({ queryKey: ['head-tables-status'] });
                queryClient.invalidateQueries({ queryKey: ['head-orders-for-tables'] });
            }
        );
        return () => { if (unsubscribe) unsubscribe(); };
    }, [restaurant?.id, queryClient]);

    React.useEffect(() => {
        if (connectionMode === 'realtime') {
            queryClient.invalidateQueries({ queryKey: ['head-tables-status'] });
            queryClient.invalidateQueries({ queryKey: ['head-orders-for-tables'] });
        }
    }, [connectionMode, queryClient]);

    // Fetch Tables
    const { data: tablesResponse, isLoading: tablesLoading } = useQuery({
        queryKey: ['head-tables-status'],
        queryFn: fetchTables,
        refetchInterval: connectionMode === 'polling' ? 5000 : false,
    });

    // Fetch Active Orders
    const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
        queryKey: ['head-orders-for-tables'],
        queryFn: fetchStaffOrders,
        refetchInterval: connectionMode === 'polling' ? 5000 : false,
    });

    const tables = React.useMemo(() => {
        const rawTables = Array.isArray(tablesResponse?.data) ? tablesResponse.data : (Array.isArray(tablesResponse) ? tablesResponse : []);
        const activeOrders = ordersResponse?.data?.filter((o: any) => o.status === 'ACTIVE') || [];

        return rawTables.map((table: any) => {
            const order = activeOrders.find((o: any) => o.table_id === table.id);
            return {
                ...table,
                currentOrder: order || null,
                isOccupied: !!order
            };
        });
    }, [tablesResponse, ordersResponse]);

    const filteredTables = tables.filter((t: any) =>
        t.table_number?.toLowerCase().includes(headerSearch.toLowerCase()) ||
        t.hall?.name?.toLowerCase().includes(headerSearch.toLowerCase())
    );

    if (tablesLoading || ordersLoading) {
        return <WaiterLayoutSkeleton />;
    }

    const handleViewOrder = (table: any) => {
        setSelectedTable(table);
        setDetailsOpen(true);
    };

    const handleNewOrder = (tableId: string) => {
        navigate(`/head/menu?table=${tableId}`);
    };

    const handleAddItems = (orderId: string, tableId: string) => {
        navigate(`/head/menu/${orderId}?table=${tableId}`);
    };

    return (
        <div className="space-y-6 pb-24 max-w-7xl mx-auto">
            {/* High-Density Stats Row */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-xl font-black text-emerald-700">{tables.filter(t => !t.isOccupied).length}</span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Available</span>
                </div>
                <div className="bg-rose-50 px-4 py-2 rounded-2xl border border-rose-100 flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-rose-600" />
                    <span className="text-xl font-black text-rose-700">{tables.filter(t => t.isOccupied).length}</span>
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Occupied</span>
                </div>
            </div>

            {/* 2-Column High-Density Grid */}
            <div className="grid grid-cols-2 gap-3 pb-24 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredTables.map((table: any) => (
                    <div
                        key={table.id}
                        onClick={() => table.isOccupied ? handleViewOrder(table) : handleNewOrder(table.id)}
                        className={`bg-white rounded-[2rem] p-3 border-2 transition-all flex flex-col justify-between aspect-square active:scale-95 cursor-pointer ${table.isOccupied
                            ? "border-rose-100 shadow-sm bg-rose-50/20"
                            : "border-slate-50 hover:border-emerald-100"
                            }`}
                    >
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-2 shadow-sm ${table.isOccupied
                                ? "bg-rose-50 text-rose-600 border border-rose-100"
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100 bg-emerald-50/50"
                                }`}>
                                <span className="text-xl font-black leading-none">{table.table_number || table.name.replace('Table ', '')}</span>
                            </div>
                            <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest line-clamp-1">{table.hall?.name || "Main"}</h3>
                            {table.isOccupied && table.currentOrder ? (
                                <div className="mt-1 flex items-center gap-1 text-rose-500 font-bold text-[8px] uppercase">
                                    <Clock className="h-2.5 w-2.5" />
                                    {new Date(table.currentOrder.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            ) : (
                                <div className="mt-1 flex items-center gap-1 text-emerald-500 font-bold text-[8px] uppercase">
                                    <Check className="h-2.5 w-2.5" />
                                    Ready
                                </div>
                            )}
                        </div>

                        {/* Minimal Action Badge */}
                        <div className="flex items-center justify-center">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center ${table.isOccupied ? 'bg-rose-500' : 'bg-slate-900'} text-white shadow-sm`}>
                                {table.isOccupied ? <Eye className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTables.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No tables found matching your search</p>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-md w-[95vw] rounded-2xl sm:rounded-[2.5rem] p-0 overflow-hidden border-none transition-all duration-300">
                    {selectedTable?.currentOrder && (
                        <div className="flex flex-col h-full bg-slate-50">
                            {/* Modal Header */}
                            <div className="bg-white px-6 py-6 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-2xl flex flex-col items-center justify-center font-black border border-rose-100 shadow-sm">
                                            <span className="text-[10px] opacity-70 leading-none mb-0.5 uppercase tracking-tighter">Table</span>
                                            <span className="text-xl leading-none">{selectedTable.table_number || selectedTable.name}</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 leading-tight">Order Details</h2>
                                            <Badge variant="outline" className="text-[10px] font-black tracking-widest bg-rose-50 border-rose-200 text-rose-600 uppercase">
                                                ACTIVE ORDER
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-50" onClick={() => setDetailsOpen(false)}>
                                        <Plus className="h-5 w-5 rotate-45" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1 text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Time</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-700">
                                            {new Date(selectedTable.currentOrder.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2 mb-1 text-slate-400">
                                            <Receipt className="h-3 w-3" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Order #</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-700">{selectedTable.currentOrder.order_number}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="px-6 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</p>
                                            <p className="text-sm font-black text-slate-900">{selectedTable.currentOrder.customer_name || "Walk-in Guest"}</p>
                                        </div>
                                    </div>
                                    {selectedTable.currentOrder.customer_phone && (
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                                            <Phone className="h-3 w-3 text-slate-400" />
                                            <span className="text-xs font-bold text-slate-600">{selectedTable.currentOrder.customer_phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto px-6 max-h-[40vh] py-2">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</span>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</span>
                                    </div>
                                    {selectedTable.currentOrder.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-100">
                                                    {item.quantity}x
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{item.name_snapshot}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-900">{formatINR(Number(item.price_snapshot) * item.quantity)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="bg-white p-6 mt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-6 px-1">
                                    <span className="text-lg font-black text-slate-400">Total Payable</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">{formatINR(selectedTable.currentOrder.total_amount)}</span>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        className="flex-1 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm uppercase gap-2 transition-all"
                                        onClick={() => handleAddItems(selectedTable.currentOrder.id, selectedTable.id)}
                                    >
                                        <Plus className="h-5 w-5" />
                                        Reorder
                                    </Button>
                                    <Button
                                        className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                                        onClick={() => {
                                            setPaymentDialogOpen(true);
                                            // Keep details open or close it? Maybe keep it open until paid?
                                            // The dialog is on top.
                                        }}
                                    >
                                        <Receipt className="h-5 w-5" />
                                        Mark Paid
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <MarkPaidDialog
                order={selectedTable?.currentOrder}
                open={paymentDialogOpen}
                onOpenChange={(open) => {
                    setPaymentDialogOpen(open);
                    if (!open) {
                        setDetailsOpen(false); // Close details modal after payment attempt (or success)
                        queryClient.invalidateQueries({ queryKey: ['head-tables-status'] });
                        queryClient.invalidateQueries({ queryKey: ['head-orders-for-tables'] });
                    }
                }}
            />
        </div >
    );
}
