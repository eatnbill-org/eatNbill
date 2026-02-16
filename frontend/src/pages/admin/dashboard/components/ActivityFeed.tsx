import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, ChevronRight, Activity } from "lucide-react";
import { useAdminOrdersStore } from "@/stores/orders";

export function ActivityFeed() {
    const { orders } = useAdminOrdersStore();
    const navigate = useNavigate();

    const activeOrders = React.useMemo(() => {
        // High fidelity filtering: Only unpaid and non-cancelled orders
        return orders
            .filter(o => o.payment_status === 'PENDING' && o.status !== 'CANCELLED')
            .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
            .slice(0, 5);
    }, [orders]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLACED': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'CONFIRMED': return 'bg-indigo-500/10 text-indigo-600 border-indigo-200';
            case 'PREPARING': return 'bg-orange-500/10 text-orange-600 border-orange-200';
            case 'READY': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
            default: return 'bg-muted/50 text-muted-foreground border-border';
        }
    };

    return (
        <Card className="rounded-[1.5rem] border border-border shadow-elev-1 bg-card text-card-foreground overflow-hidden flex flex-col h-[320px]">
            <CardHeader className="py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                        Live Feed
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600 border-indigo-100 px-1.5 py-0">
                        {activeOrders.length} UNPAID
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto no-scrollbar">
                <div className="divide-y divide-border/50">
                    <AnimatePresence mode="popLayout">
                        {activeOrders.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground/50">
                                <p className="text-[10px] font-bold uppercase tracking-widest italic opacity-50">Queue Clear</p>
                                <p className="text-[9px] uppercase font-black tracking-tighter mt-1 opacity-30">All orders are settled</p>
                            </div>
                        ) : (
                            activeOrders.map((order, idx) => (
                                <motion.div
                                    key={order.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => navigate('/admin/orders')}
                                    className="p-3 hover:bg-muted/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-foreground tracking-tighter italic">
                                                    #{order.order_number}
                                                </span>
                                                <Badge className={`text-[8px] font-black tracking-widest px-1.5 py-0 h-3.5 border ${getStatusColor(order.status)} hover:${getStatusColor(order.status)}`}>
                                                    {order.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-2.5 h-2.5" />
                                                    <span className="text-[9px] font-bold uppercase tracking-tight">
                                                        {order.table_number ? `T-${order.table_number}` : order.order_type}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    <span className="text-[9px] font-bold uppercase tracking-tight">
                                                        {new Date(order.placed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 self-center">
                                            <div className="text-right">
                                                <p className="text-[11px] font-black text-foreground tracking-tighter line-clamp-1 max-w-[80px]">
                                                    {order.customer_name || 'Guest'}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
            {activeOrders.length > 0 && (
                <div
                    onClick={() => navigate('/admin/orders')}
                    className="p-2.5 bg-muted/30 text-center border-t border-border/50 hover:bg-indigo-50 transition-colors cursor-pointer group mt-auto"
                >
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-indigo-600">
                        View Console
                    </span>
                </div>
            )}
        </Card>
    );
}
