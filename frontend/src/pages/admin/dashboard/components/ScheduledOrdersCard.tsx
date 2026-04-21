import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, ChevronRight, CalendarClock } from "lucide-react";
import { useAdminOrdersStore } from "@/stores/orders";
import { format } from "date-fns";

export function ScheduledOrdersCard() {
    const { orders } = useAdminOrdersStore();
    const navigate = useNavigate();

    const scheduledOrders = React.useMemo(() => {
        // Filter for orders with arrive_at and status ACTIVE
        return orders
            .filter(o => o.arrive_at !== null && o.status === 'ACTIVE')
            .sort((a, b) => new Date(a.arrive_at!).getTime() - new Date(b.arrive_at!).getTime())
            .slice(0, 10);
    }, [orders]);

    return (
        <Card className="rounded-[1.5rem] border border-border shadow-elev-1 bg-card text-card-foreground overflow-hidden flex flex-col h-[320px]">
            <CardHeader className="py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                        Scheduled Orders
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-600 border-amber-100 px-1.5 py-0">
                        {scheduledOrders.length} UPCOMING
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto no-scrollbar">
                <div className="divide-y divide-border/50">
                    <AnimatePresence mode="popLayout">
                        {scheduledOrders.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground/50">
                                <p className="text-[10px] font-bold uppercase tracking-widest italic opacity-50">No Schedules</p>
                                <p className="text-[9px] uppercase font-black tracking-tighter mt-1 opacity-30">All orders are live or completed</p>
                            </div>
                        ) : (
                            scheduledOrders.map((order) => {
                                const arriveDate = new Date(order.arrive_at!);
                                return (
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
                                                    <Badge className="text-[8px] font-black tracking-widest px-1.5 py-0 h-3.5 bg-amber-50 text-amber-600 border-amber-200">
                                                        SCHEDULED
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
                                                        <span className="text-[9px] font-bold uppercase tracking-tight text-amber-700">
                                                            {format(arriveDate, 'MMM d, hh:mm a')}
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
                                                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
            {scheduledOrders.length > 0 && (
                <div
                    onClick={() => navigate('/admin/orders')}
                    className="p-2.5 bg-muted/30 text-center border-t border-border/50 hover:bg-amber-50 transition-colors cursor-pointer group mt-auto"
                >
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-amber-600">
                        View Order Console
                    </span>
                </div>
            )}
        </Card>
    );
}
