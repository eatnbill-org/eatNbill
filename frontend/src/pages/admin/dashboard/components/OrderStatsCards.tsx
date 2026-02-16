import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminOrdersStore } from "@/stores/orders";
import { ShoppingBag, Clock, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export function OrderStatsCards() {
    const { orders } = useAdminOrdersStore();

    const stats = React.useMemo(() => {
        const total = orders.length;
        const active = orders.filter(o => o.payment_status === 'PENDING' && o.status !== 'CANCELLED').length;
        const completed = orders.filter(o => o.payment_status === 'PAID' && o.status === 'COMPLETED').length;
        const cancelled = orders.filter(o => o.status === 'CANCELLED').length;

        return { total, active, completed, cancelled };
    }, [orders]);

    const statItems = [
        {
            title: "Shift Volume",
            label: "Total Orders",
            value: stats.total,
            icon: <ShoppingBag className="h-5 w-5" />,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100/50",
            percentage: "Full Shift"
        },
        {
            title: "Active Pulse",
            label: "Current Waiting",
            value: stats.active,
            icon: <Clock className="h-5 w-5" />,
            color: "text-primary",
            bg: "bg-primary/10",
            border: "border-primary/20",
            percentage: "Ongoing"
        },
        {
            title: "Settled Flow",
            label: "Paid Orders",
            value: stats.completed,
            icon: <CheckCircle2 className="h-5 w-5" />,
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            border: "border-emerald-100/50",
            percentage: "Success"
        },
        {
            title: "Voided Items",
            label: "Cancelled",
            value: stats.cancelled,
            icon: <XCircle className="h-5 w-5" />,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "border-rose-100/50",
            percentage: "Removed"
        },
    ];

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
            {statItems.map((item, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                >
                    <Card className={`rounded-[1.5rem] border border-border shadow-elev-1 bg-card text-card-foreground group hover:scale-[1.01] transition-all hover:shadow-elev-2`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-5">
                            <div className="flex flex-col">
                                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 leading-none">
                                    {item.title}
                                </CardTitle>
                                <span className="text-[11px] font-medium text-muted-foreground/80 leading-none">
                                    {item.label}
                                </span>
                            </div>
                            <div className={`p-2 rounded-xl ${item.bg} ${item.color} shadow-sm group-hover:rotate-12 transition-transform`}>
                                {React.cloneElement(item.icon as React.ReactElement, { className: "h-4 w-4" })}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2 pb-4 px-5">
                            <div className="flex items-end justify-between">
                                <div className={`text-2xl font-bold tracking-tight ${item.color} leading-none`}>
                                    {item.value.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-full border border-border/50">
                                    <TrendingUp className="w-2.5 h-2.5 text-muted-foreground" />
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                                        {item.percentage}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
