import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminOrdersStore } from "@/stores/orders";
import { Wallet, AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatINR } from "@/lib/format";
import { useNavigate } from "react-router-dom";

export function UnpaidBillsCard() {
    const { orders } = useAdminOrdersStore();
    const navigate = useNavigate();

    const unpaidStats = React.useMemo(() => {
        const pending = orders.filter(o => o.payment_status === 'PENDING' && o.status !== 'CANCELLED');
        const totalAmount = pending.reduce((s, o) => s + parseFloat(o.total_amount), 0);

        // Split by credit
        const creditCount = pending.filter(o => o.payment_method === 'CREDIT').length;
        const creditAmount = pending.filter(o => o.payment_method === 'CREDIT').reduce((s, o) => s + parseFloat(o.total_amount), 0);

        return {
            count: pending.length,
            total: totalAmount,
            creditCount,
            creditAmount
        };
    }, [orders]);

    return (
        <Card
            onClick={() => navigate('/admin/orders')}
            className="rounded-[1.5rem] border border-border shadow-elev-1 bg-card text-card-foreground overflow-hidden flex flex-col h-[320px] cursor-pointer hover:border-orange-500/50 transition-all group hover:shadow-elev-2"
        >
            <CardHeader className="py-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-orange-500" />
                        Oustanding
                    </CardTitle>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-auto no-scrollbar">
                <div className="space-y-4">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Total Unpaid</p>
                            <h3 className="text-2xl font-black text-foreground tracking-tighter italic">
                                {formatINR(unpaidStats.total)}
                            </h3>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black uppercase bg-orange-500/10 text-orange-600 border-orange-500/20 mb-1 px-1.5 py-0">
                            {unpaidStats.count} BILLS
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">On Credit</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[11px] font-black text-foreground">{formatINR(unpaidStats.creditAmount)}</span>
                                <span className="text-[7px] font-bold text-muted-foreground">({unpaidStats.creditCount})</span>
                            </div>
                        </div>
                        <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Cash/Other</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[11px] font-black text-foreground">{formatINR(unpaidStats.total - unpaidStats.creditAmount)}</span>
                                <span className="text-[7px] font-bold text-muted-foreground">({unpaidStats.count - unpaidStats.creditCount})</span>
                            </div>
                        </div>
                    </div>

                    {unpaidStats.total > 1000 && (
                        <div className="flex items-center gap-2 py-1.5 px-2 bg-rose-50 rounded-lg border border-rose-100">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600">High Balance Alert</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
