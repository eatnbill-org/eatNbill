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
            title: "Internal Pool",
            label: "Total Orders",
            value: stats.total,
            icon: <ShoppingBag className="h-5 w-5" />,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100/50",
            percentage: "Live Shift"
        },
        {
            title: "Live Queue",
            label: "Unpaid / Active",
            value: stats.active,
            icon: <Clock className="h-5 w-5" />,
            color: "text-orange-600",
            bg: "bg-orange-50",
            border: "border-orange-100/50",
            percentage: "Ongoing"
        },
        {
            title: "Closed Loop",
            label: "Paid Orders",
            value: stats.completed,
            icon: <CheckCircle2 className="h-5 w-5" />,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100/50",
            percentage: "Settled"
        },
        {
            title: "Terminated",
            label: "Cancelled",
            value: stats.cancelled,
            icon: <XCircle className="h-5 w-5" />,
            color: "text-rose-600",
            bg: "bg-rose-50",
            border: "border-rose-100/50",
            percentage: "Voided"
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
                    <Card className={`rounded-[1.5rem] border-none shadow-xl shadow-slate-200/50 bg-white group hover:scale-[1.02] transition-transform`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                            <div className="flex flex-col">
                                <CardTitle className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">
                                    {item.title}
                                </CardTitle>
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter italic leading-none">
                                    {item.label}
                                </span>
                            </div>
                            <div className={`p-2 rounded-xl ${item.bg} ${item.color} shadow-sm group-hover:rotate-12 transition-transform`}>
                                {React.cloneElement(item.icon as React.ReactElement, { className: "h-3.5 w-3.5" })}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-1 pb-3 px-4">
                            <div className="flex items-end justify-between">
                                <div className={`text-2xl font-black italic tracking-tighter ${item.color} leading-none`}>
                                    {item.value.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0 rounded-full border border-slate-100">
                                    <TrendingUp className="w-2 h-2 text-slate-400" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
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
