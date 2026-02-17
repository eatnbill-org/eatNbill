import * as React from "react";
import "@/styles/print.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    ArrowDownRight,
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
    Download,
    FileText,
    Printer,
    GitCompare
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAdvancedAnalytics } from "@/api/analytics";
import { useQuery } from "@tanstack/react-query";
import { ComposedChart, Bar, Legend } from "recharts";
import { PaymentMethodChart } from "@/components/analytics/PaymentMethodChart";
import { exportToCSV, exportToPDF, printAnalytics } from "@/utils/export-analytics";
import { DashboardStatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";

type RangeKey = "daily" | "monthly" | "yearly";

// Using unified theme colors from Enterprise Profile
// Using unified theme colors for Sales Performance
const COLORS = ["#10b981", "#059669", "#0ea5e9", "#06b6d4", "#2dd4bf"];

export default function AdminAnalyticsPage() {
    const { settleCredit } = useAdminOrdersStore();
    const [view, setView] = React.useState<RangeKey>("daily");
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [compareWithPrevious, setCompareWithPrevious] = React.useState(false);

    // --- 1. REMOTE DATA FETCHING ---
    const { data: analyticsData, isLoading, refetch } = useQuery({
        queryKey: ["advanced-analytics", view, date?.toISOString(), compareWithPrevious],
        queryFn: async () => {
            const dateStr = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
            return getAdvancedAnalytics(view, dateStr, compareWithPrevious);
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
    const paymentMethods = analyticsData?.paymentMethods || [];
    const comparison = analyticsData?.comparison;

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

    // Calculate avg order value
    const avgOrderValue = (metrics.totalOrders || 0) > 0
        ? Math.round((metrics.totalRevenue || 0) / (metrics.totalOrders || 1))
        : 0;

    return (
        <div className="min-h-full bg-slate-50/50">
            {isLoading && !revenue && (
                <div className="space-y-6 py-6">
                    <DashboardStatsSkeleton />
                    <TableSkeleton rows={6} />
                </div>
            )}

            {/* Always show the analytics dashboard, even if data is 0 */}
            <motion.div
                className="container py-8 space-y-8 no-scrollbar max-w-7xl mx-auto px-4 md:px-8"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* --- HEADER SECTION --- */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <motion.div variants={itemVariants}>
                        <div className="flex items-center gap-2.5 mb-1.5 px-0.5">
                            <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
                                <Activity className="w-4 h-4" />
                            </div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">Analytics Dashboard</h1>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground max-w-lg leading-snug px-0.5">
                            View your restaurant's performance, sales, and order trends in real-time.
                        </p>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
                        {/* Export & Compare Buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant={compareWithPrevious ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCompareWithPrevious(!compareWithPrevious)}
                                className="h-9 px-4 rounded-xl font-medium text-xs no-print"
                            >
                                <GitCompare className="mr-2 h-3.5 w-3.5" />
                                Compare
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-4 rounded-xl border-slate-200 hover:bg-slate-50 font-medium text-xs no-print"
                                    >
                                        <Download className="mr-2 h-3.5 w-3.5" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem 
                                        onClick={() => analyticsData && exportToCSV(analyticsData, view, date || new Date())}
                                        className="cursor-pointer"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Export CSV
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={() => analyticsData && exportToPDF(analyticsData, view, date || new Date())}
                                        className="cursor-pointer"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Export PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                        onClick={printAnalytics}
                                        className="cursor-pointer"
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Print
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Date & View Controls */}
                        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-9 px-3 text-muted-foreground hover:text-primary font-medium text-xs hover:bg-accent"
                                    >
                                        <CalendarIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                        <span className="hidden sm:inline">{date ? format(date, "PPP") : "Select Date"}</span>
                                        <span className="sm:hidden">{date ? format(date, "MMM d") : "Date"}</span>
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
                                            className="h-7 px-3 text-xs font-semibold capitalize data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
                                        >
                                            {v}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    </motion.div>
                </div>

                {/* --- 1. KEY PERFORMANCE INDICATORS --- */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { 
                            label: "Total Revenue", 
                            value: formatINR(metrics.totalRevenue), 
                            icon: DollarSign, 
                            comparisonKey: "revenue" as const,
                            color: "emerald" 
                        },
                        { 
                            label: "Total Profit", 
                            value: formatINR(metrics.totalProfit), 
                            icon: TrendingUp, 
                            comparisonKey: "profit" as const,
                            color: "emerald" 
                        },
                        { 
                            label: "Pending Dues", 
                            value: formatINR(debts.reduce((acc: number, curr: any) => acc + curr.amount, 0)), 
                            icon: Wallet, 
                            trend: `${debts.length} Accounts`, 
                            color: "orange",
                            comparisonKey: null
                        },
                        { 
                            label: "Orders Fulfilled", 
                            value: metrics.totalOrders, 
                            icon: ShoppingBag, 
                            comparisonKey: "orders" as const,
                            color: "emerald" 
                        }
                    ].map((stat, i) => {
                        const compData = stat.comparisonKey && comparison ? comparison[stat.comparisonKey] : null;
                        const growth = compData?.growth || 0;
                        const isPositive = growth >= 0;
                        const showComparison = compareWithPrevious && compData;

                        return (
                            <motion.div key={stat.label} variants={itemVariants}>
                                <Card className="rounded-[1.5rem] border-none shadow-xl shadow-slate-100/50 bg-white group hover:scale-[1.02] transition-transform page-break-avoid">
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">{stat.label}</p>
                                                <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">{stat.value}</h3>
                                                {showComparison && (
                                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                        Prev: {typeof stat.value === 'number' ? compData.previous : formatINR(compData.previous)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className={cn("p-2 sm:p-2.5 rounded-xl transition-colors flex-shrink-0", {
                                                "bg-emerald-50 text-emerald-600": stat.color === "emerald",
                                                "bg-orange-50 text-orange-600": stat.color === "orange",
                                            })}>
                                                <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {showComparison ? (
                                                <>
                                                    <span className={cn("text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5", {
                                                        "bg-emerald-50 text-emerald-600": isPositive,
                                                        "bg-red-50 text-red-600": !isPositive,
                                                    })}>
                                                        {isPositive ? (
                                                            <ArrowUpRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                        ) : (
                                                            <ArrowDownRight className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                                        )}
                                                        {Math.abs(growth).toFixed(1)}%
                                                    </span>
                                                    <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">vs Previous</span>
                                                </>
                                            ) : stat.trend ? (
                                                <>
                                                    <span className={cn("text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md", {
                                                        "bg-emerald-50 text-emerald-600": stat.color === "emerald",
                                                        "bg-orange-50 text-orange-600": stat.color === "orange",
                                                    })}>
                                                        {stat.trend}
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* --- 2. DATA VISUALIZATION LAYER --- */}
                <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">

                    <motion.div className="lg:col-span-4" variants={itemVariants}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden">
                            <CardHeader className="p-8 pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Layers className="w-3 h-3" />
                                    </div>
                                    <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Revenue Trend</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-medium text-muted-foreground">Analysis of sales over time</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0 h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                                            stroke="hsl(var(--primary))"
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

                    <motion.div className="lg:col-span-3" variants={itemVariants}>
                        <Card className="rounded-[2rem] border-none shadow-2xl shadow-slate-200/40 bg-white overflow-hidden h-full page-break-avoid">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                <TrendingUp className="w-3 h-3" />
                                            </div>
                                            <CardTitle className="text-sm font-bold text-foreground uppercase tracking-wider">Top Performing Categories</CardTitle>
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
                                                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-foreground leading-none mb-1">{c.name}</p>
                                                        <p className="text-[10px] font-medium text-muted-foreground">{formatINR(c.value)}</p>
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

                {/* --- PAYMENT METHODS SECTION --- */}
                {paymentMethods.length > 0 && (
                    <motion.div variants={itemVariants} className="page-break-avoid">
                        <PaymentMethodChart data={paymentMethods} />
                    </motion.div>
                )}

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
        </div>
    );
}
