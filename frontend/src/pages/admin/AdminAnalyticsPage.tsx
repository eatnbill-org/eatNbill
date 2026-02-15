import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAdminOrdersStore } from "@/stores/orders/adminOrders.store";
import { formatINR } from "@/lib/format";
import { motion } from "framer-motion";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import {
    ArrowUpRight,
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign,
    Calendar as CalendarIcon,
    CheckCircle2,
    Wallet,
    Activity,
    ChevronRight,
    Layers,
    LayoutGrid,
    Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAdvancedAnalytics } from "@/api/analytics";
import { useQuery } from "@tanstack/react-query";
import { ComposedChart, Bar, Legend } from "recharts";

type RangeKey = "daily" | "monthly" | "yearly";

// Using unified theme colors from Enterprise Profile
const COLORS = ["#4f46e5", "#10b981", "#6366f1", "#0ea5e9", "#8b5cf6"];

export default function AdminAnalyticsPage() {
    const { settleCredit } = useAdminOrdersStore();
    const [view, setView] = React.useState<RangeKey>("daily");
    const [date, setDate] = React.useState<Date | undefined>(new Date());

    // --- 1. REMOTE DATA FETCHING ---
    const { data: analyticsData, isLoading, refetch } = useQuery({
        queryKey: ["advanced-analytics", view, date?.toISOString()],
        queryFn: async () => {
            const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
            // @ts-ignore
            return getAdvancedAnalytics(view, dateStr);
        },
        enabled: !!date,
        refetchInterval: 30000,
    });

    const metrics = analyticsData?.metrics || {
        totalRevenue: 0,
        totalOrders: 0,
        totalCost: 0,
        totalProfit: 0,
    };

    const trends = analyticsData?.trends || [];
    const distribution = analyticsData?.distribution || [];
    const products = analyticsData?.products || [];
    const debts = analyticsData?.debts || [];

    // Revenue for conditional rendering
    const revenue = metrics.totalRevenue;

    // --- 2. CHART DATA PREPARATION ---
    const chartData = React.useMemo(() => {
        if (!trends.length) return [];

        return trends.map(t => {
            const date = parseISO(t.period);
            let formattedPeriod = '';

            if (view === 'daily') {
                formattedPeriod = format(date, 'h a'); // 10 AM
            } else if (view === 'monthly') {
                formattedPeriod = format(date, 'MMM d'); // Feb 12
            } else {
                formattedPeriod = format(date, 'MMM'); // Feb
            }

            return {
                ...t,
                period: formattedPeriod,
                revenue: Number(t.revenue),
                orders: Number(t.orders)
            };
        });
    }, [trends, view]);

    const categoryData = React.useMemo(() => {
        if (distribution.length > 0) return distribution;
        return [];
    }, [distribution]);

    // --- 3. TOGGLE STATE FOR SALES PERFORMANCE ---
    const [showProducts, setShowProducts] = React.useState(false);

    // --- 4. UDHAAR LIST ---
    const udhaarList = React.useMemo(() => {
        if (debts.length > 0) return debts;
        return [];
    }, [debts]);

    const handleSettleUdhaar = async (customerId: string, amount: number, name: string) => {
        const settleAmountStr = prompt(`Enter amount to settle for ${name}:`, amount.toString());
        if (!settleAmountStr) return;

        const settleAmount = parseFloat(settleAmountStr);
        if (isNaN(settleAmount) || settleAmount <= 0) {
            toast.error("Invalid amount");
            return;
        }

        const success = await settleCredit({
            customer_id: customerId,
            amount: settleAmount
        });

        if (success) {
            toast.success(`Received ${formatINR(settleAmount)} from ${name}`, {
                description: "Successfully merged into operational revenue.",
                icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            });
            refetch(); // Refresh analytics after settlement
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-slate-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Calculate avg order value
    const avgOrderValue = (metrics.totalOrders || 0) > 0
        ? Math.round((metrics.totalRevenue || 0) / (metrics.totalOrders || 1))
        : 0;

    return (
        <div className="min-h-full bg-slate-50/50">
            {isLoading && !revenue && (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                </div>
            )}

            {!isLoading && !revenue && trends.length === 0 && (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 p-8">
                    <Activity className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No analytics data available yet.</p>
                </div>
            )}

            {(revenue || trends.length > 0) && (
                <motion.div
                    className="container py-8 space-y-8 no-scrollbar max-w-7xl mx-auto px-4 md:px-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    {/* --- HEADER SECTION --- */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <motion.div variants={itemVariants}>
                            <div className="flex items-center gap-2.5 mb-1.5 px-0.5">
                                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Operational Intelligence</h1>
                            </div>
                            <p className="text-[13px] font-medium text-slate-400 max-w-lg leading-snug px-0.5">
                                Analyzing real-time performance metrics and capital flow across your enterprise.
                            </p>
                        </motion.div>

                        <motion.div
                            variants={itemVariants}
                            className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm"
                        >
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-9 px-4 text-slate-500 hover:text-indigo-600 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50"
                                    >
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                        {date ? format(date, "PPP") : "Select Date"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-slate-100 shadow-2xl" align="end">
                                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                </PopoverContent>
                            </Popover>

                            <div className="h-4 w-px bg-slate-100 mx-1"></div>

                            <Tabs value={view} onValueChange={(v) => setView(v as RangeKey)}>
                                <TabsList className="h-9 bg-transparent p-0 gap-1">
                                    {["daily", "monthly", "yearly"].map((v) => (
                                        <TabsTrigger
                                            key={v}
                                            value={v}
                                            className="h-7 px-3 text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-lg"
                                        >
                                            {v}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </motion.div>
                    </div>

                    {/* --- 1. KEY PERFORMANCE INDICATORS --- */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Revenue Matrix", value: formatINR(metrics.totalRevenue), icon: DollarSign, trend: "+12.5%", color: "indigo" },
                            { label: "Net Asset Growth", value: formatINR(metrics.totalProfit), icon: TrendingUp, trend: "35% Margin", color: "emerald" },
                            { label: "Receivable Debt", value: formatINR(udhaarList.reduce((acc: number, curr: any) => acc + curr.amount, 0)), icon: Wallet, trend: `${udhaarList.length} Accounts`, color: "orange" },
                            { label: "Orders Fulfilled", value: metrics.totalOrders, icon: ShoppingBag, trend: "98% Success", color: "purple" }
                        ].map((stat, i) => (
                            <motion.div key={stat.label} variants={itemVariants}>
                                <Card className="rounded-[1.5rem] border-none shadow-xl shadow-slate-100/50 bg-white group hover:scale-[1.02] transition-transform">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
                                            </div>
                                            <div className={cn("p-2.5 rounded-xl transition-colors", {
                                                "bg-indigo-50 text-indigo-600": stat.color === "indigo",
                                                "bg-emerald-50 text-emerald-600": stat.color === "emerald",
                                                "bg-orange-50 text-orange-600": stat.color === "orange",
                                                "bg-purple-50 text-purple-600": stat.color === "purple",
                                            })}>
                                                <stat.icon className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", {
                                                "bg-indigo-50 text-indigo-600": stat.color === "indigo",
                                                "bg-emerald-50 text-emerald-600": stat.color === "emerald",
                                                "bg-orange-50 text-orange-600": stat.color === "orange",
                                                "bg-purple-50 text-purple-600": stat.color === "purple",
                                            })}>
                                                <ArrowUpRight className="h-2.5 w-2.5 inline mr-0.5" />
                                                {stat.trend}
                                            </span>
                                            <span className="text-[9px] font-medium text-slate-300 uppercase tracking-wider">vs Last Period</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* --- 2. DATA VISUALIZATION LAYER --- */}
                    <div className="grid gap-6 md:grid-cols-7">

                        <motion.div className="md:col-span-4" variants={itemVariants}>
                            <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                                <CardHeader className="p-8 pb-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Layers className="w-3 h-3" />
                                        </div>
                                        <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">Revenue Trajectory</CardTitle>
                                    </div>
                                    <CardDescription className="text-[11px] font-medium text-slate-400">Time-series analysis of operational capital inflow</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0 h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="period"
                                                fontSize={10}
                                                fontFamily="inherit"
                                                fontWeight={700}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#94a3b8' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                yAxisId="left"
                                                fontSize={10}
                                                fontWeight={700}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#94a3b8' }}
                                                tickFormatter={(v) => `₹${v / 1000}k`}
                                            />
                                            <YAxis
                                                yAxisId="right"
                                                orientation="right"
                                                fontSize={10}
                                                fontWeight={700}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: '#fbbf24' }} // Amber/Orange for orders
                                                tickFormatter={(v) => v}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                                    padding: '12px 16px'
                                                }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#1e293b' }}
                                                labelStyle={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}
                                                cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                            <Bar yAxisId="right" dataKey="orders" name="Orders Count" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Area
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="revenue"
                                                name="Revenue"
                                                stroke="#4f46e5"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                                animationDuration={1500}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div className="md:col-span-3" variants={itemVariants}>
                            <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden h-full">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                    <TrendingUp className="w-3 h-3" />
                                                </div>
                                                <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-widest">Sales Performance</CardTitle>
                                            </div>
                                            <CardDescription className="text-[11px] font-medium text-slate-400">
                                                {showProducts ? 'Top selling products breakdown' : 'Revenue distribution by category'}
                                            </CardDescription>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowProducts(!showProducts)}
                                            className="h-8 px-4 rounded-xl border-slate-200 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest"
                                        >
                                            {showProducts ? 'Categories' : 'Products'}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 pb-8 flex flex-col items-center">
                                    {!showProducts ? (
                                        <>
                                            <div className="h-[220px] w-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={categoryData}
                                                            cx="50%" cy="50%"
                                                            innerRadius={65}
                                                            outerRadius={90}
                                                            paddingAngle={8}
                                                            dataKey="value"
                                                            stroke="none"
                                                        >
                                                            {categoryData.map((entry: any, index: number) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{categoryData.length}</span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Categories</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-8 w-full mt-4">
                                                {categoryData.map((c: any, i: number) => (
                                                    <div key={c.name} className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full ring-2 ring-offset-2" style={{ backgroundColor: COLORS[i] }}></div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-none mb-1">{c.name}</p>
                                                            <p className="text-[9px] font-bold text-slate-400">{formatINR(c.value)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full px-4">
                                            <div className="max-h-[340px] overflow-y-auto no-scrollbar">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-slate-100 hover:bg-transparent">
                                                            <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</TableHead>
                                                            <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Sold</TableHead>
                                                            <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {products.map((p: any, idx: number) => (
                                                            <TableRow key={idx} className="border-slate-100 hover:bg-slate-50 transition-colors">
                                                                <TableCell className="py-3">
                                                                    <div className="font-black text-slate-800 text-sm tracking-tight">{p.name}</div>
                                                                </TableCell>
                                                                <TableCell className="text-right py-3">
                                                                    <span className="font-black text-slate-700">{p.quantity}</span>
                                                                    <span className="text-[9px] text-slate-400 ml-1">units</span>
                                                                </TableCell>
                                                                <TableCell className="text-right py-3 font-black text-slate-800">
                                                                    {formatINR(p.revenue)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {products.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={3} className="py-20 text-center">
                                                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                                                        <ShoppingBag className="h-8 w-8 text-slate-400" />
                                                                        <p className="font-black text-slate-600 uppercase tracking-widest text-[10px]">No Products Sold</p>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* --- 3. RECEIVABLE RECOVERY --- */}
                    <div className="grid gap-8">

                        {/* Quick Debt Recovery System */}
                        <motion.div variants={itemVariants}>
                            <Card className="rounded-[2rem] border border-orange-100 bg-orange-50/20 shadow-xl shadow-orange-100/20 overflow-hidden">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="h-6 w-6 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <Wallet className="h-3 w-3" />
                                                </div>
                                                <CardTitle className="text-sm font-black text-orange-900 uppercase tracking-widest">Receivable Recovery</CardTitle>
                                            </div>
                                            <CardDescription className="text-[10px] font-semibold text-orange-700/60 uppercase tracking-widest">Active Credit Protocols</CardDescription>
                                        </div>
                                        <Badge className="bg-orange-200 text-orange-800 font-black text-[9px] px-3 py-1 rounded-lg">
                                            {udhaarList.length} PENDING
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[340px] overflow-y-auto no-scrollbar px-2">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-orange-100/50 hover:bg-transparent">
                                                    <TableHead className="text-[10px] font-black text-orange-900/40 uppercase tracking-widest pl-8">Account</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black text-orange-900/40 uppercase tracking-widest">Balance</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black text-orange-900/40 uppercase tracking-widest pr-8">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {udhaarList.map((c: any) => (
                                                    <TableRow key={c.id} className="group border-none hover:bg-orange-100/30 transition-colors">
                                                        <TableCell className="py-4 pl-8">
                                                            <div className="font-black text-slate-800 text-sm tracking-tight">{c.customer}</div>
                                                            <div className="text-[9px] text-orange-600/60 font-black tracking-widest uppercase">{c.phone}</div>
                                                        </TableCell>
                                                        <TableCell className="text-right py-4 font-black text-slate-800">
                                                            {formatINR(c.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-right py-4 pr-8">
                                                            <Button
                                                                size="sm"
                                                                className="h-8 rounded-xl bg-white text-orange-600 border border-orange-100 hover:bg-orange-600 hover:text-white hover:border-orange-600 font-black uppercase text-[9px] tracking-widest shadow-sm transition-all px-4"
                                                                onClick={() => handleSettleUdhaar(c.id, c.amount, c.customer)}
                                                            >
                                                                Settle
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {udhaarList.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="py-20 text-center">
                                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                                <CheckCircle2 className="h-8 w-8 text-orange-400" />
                                                                <p className="font-black text-orange-800 uppercase tracking-widest text-[10px]">Accounts Cleared</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                    </div>
                </motion.div>
            )}
        </div>
    );
}
