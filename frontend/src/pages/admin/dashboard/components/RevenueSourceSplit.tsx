import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useAdminOrdersStore } from "@/stores/orders";
import { PieChart as PieChartIcon } from "lucide-react";

interface RevenueSourceSplitProps {
    profit?: number;
    showProfit?: boolean;
    setShowProfit?: (v: boolean) => void;
}

export function RevenueSourceSplit({ profit = 0, showProfit = false, setShowProfit }: RevenueSourceSplitProps) {
    const { orders } = useAdminOrdersStore();

    const data = React.useMemo(() => {
        const sources: Record<string, number> = {};
        orders.forEach(o => {
            if (o.status === 'COMPLETED' && o.payment_status === 'PAID') {
                const source = o.source || 'OTHER';
                const amount = parseFloat(o.total_amount);
                sources[source] = (sources[source] || 0) + amount;
            }
        });

        return Object.entries(sources)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [orders]);

    const COLORS = {
        'ZOMATO': '#E23744',
        'SWIGGY': '#FC8019',
        'QR': '#3B82F6',
        'MANUAL': '#10B981',
        'WEB': '#8B5CF6',
        'OTHER': '#64748B'
    };

    const totalRevenue = data.reduce((s, d) => s + d.value, 0);
    const displayTotal = showProfit ? profit : totalRevenue;

    return (
        <Card className="rounded-[1.5rem] border-slate-100 shadow-xl shadow-slate-200/50 bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[320px]">
            <CardHeader className="py-3 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <PieChartIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Revenue Channels
                </CardTitle>
                {setShowProfit && (
                    <button
                        onClick={() => setShowProfit(!showProfit)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border transition-all ${showProfit
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                            }`}
                    >
                        {showProfit ? "View Revenue" : "View Profit"}
                    </button>
                )}
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col items-center justify-start overflow-auto no-scrollbar pb-4">
                {data.length > 0 ? (
                    <>
                        <div className="h-[140px] w-full relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        innerRadius={45}
                                        outerRadius={55}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.OTHER} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    {showProfit ? "Profit" : "Total"}
                                </span>
                                <span className={`text-lg font-black tracking-tighter transition-colors ${showProfit ? "text-emerald-500" : "text-slate-800"}`}>
                                    ₹{Math.round(displayTotal).toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full mt-2">
                            {data.map((entry) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div
                                        className="h-1.5 w-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] || COLORS.OTHER }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">
                                            {entry.name}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-700">
                                            {Math.round((entry.value / totalRevenue) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <PieChartIcon className="w-8 h-8 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic opacity-50">No Data Available</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
