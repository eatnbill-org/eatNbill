import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentMethod } from "@/api/analytics";
import { formatINR } from "@/lib/format";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { CreditCard, DollarSign } from "lucide-react";

interface PaymentMethodChartProps {
    data: PaymentMethod[];
}

const PAYMENT_COLORS: Record<string, string> = {
    CASH: "#10b981", // green
    UPI: "#8b5cf6",  // purple
    CARD: "#3b82f6", // blue
    CREDIT: "#f59e0b", // orange/amber
    OTHER: "#6b7280"  // gray
};

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
    const [viewMode, setViewMode] = React.useState<"amount" | "count">("amount");

    const chartData = React.useMemo(() => {
        return data.map(pm => ({
            name: pm.method,
            value: viewMode === "amount" ? pm.amount : pm.count,
            count: pm.count,
            amount: pm.amount
        }));
    }, [data, viewMode]);

    const total = React.useMemo(() => {
        return data.reduce((acc, pm) => 
            acc + (viewMode === "amount" ? pm.amount : pm.count), 0
        );
    }, [data, viewMode]);

    if (data.length === 0) {
        return (
            <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <CreditCard className="w-3 h-3" />
                        </div>
                        <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                            Payment Methods
                        </CardTitle>
                    </div>
                    <CardDescription className="text-xs font-medium text-muted-foreground">
                        No payment data available
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; count: number; amount: number } }> }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg">
                    <p className="text-xs font-bold text-slate-800 mb-1">{data.name}</p>
                    <p className="text-xs text-slate-600">
                        Count: <span className="font-bold">{data.count}</span>
                    </p>
                    <p className="text-xs text-slate-600">
                        Amount: <span className="font-bold">{formatINR(data.amount)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <CreditCard className="w-3 h-3" />
                            </div>
                            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">
                                Payment Methods
                            </CardTitle>
                        </div>
                        <CardDescription className="text-[11px] font-medium text-slate-400">
                            {viewMode === "amount" ? "Revenue by payment type" : "Transaction count by payment type"}
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewMode(viewMode === "amount" ? "count" : "amount")}
                        className="h-8 px-4 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest"
                    >
                        {viewMode === "amount" ? "Count" : "Amount"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 pb-8 flex flex-col items-center">
                <div className="h-[220px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={65}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={PAYMENT_COLORS[entry.name.toUpperCase()] || PAYMENT_COLORS.OTHER} 
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <DollarSign className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-2xl font-black text-slate-800 tracking-tighter">
                            {viewMode === "amount" ? formatINR(total) : total}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Total {viewMode === "amount" ? "Revenue" : "Transactions"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-8 w-full mt-4">
                    {data.map((pm, i) => (
                        <div key={pm.method} className="flex items-center gap-3">
                            <div 
                                className="h-2.5 w-2.5 rounded-full" 
                                style={{ 
                                    backgroundColor: PAYMENT_COLORS[pm.method.toUpperCase()] || PAYMENT_COLORS.OTHER 
                                }}
                            ></div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-foreground leading-none mb-1 capitalize">
                                    {pm.method.toLowerCase()}
                                </p>
                                <p className="text-[10px] font-medium text-muted-foreground">
                                    {viewMode === "amount" ? formatINR(pm.amount) : `${pm.count} txns`}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
