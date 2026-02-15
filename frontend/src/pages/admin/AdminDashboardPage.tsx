// import * as React from "react";
// import { 
//   BarChart3, 
//   Plus, 
//   Settings2, 
//   Printer, 
//   CheckCircle2, 
//   ChevronLeft, 
//   ChevronRight 
// } from "lucide-react"; 
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// import { Switch } from "@/components/ui/switch";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import AddManualOrderDialog from "@/pages/admin/AddManualOrderDialog";
// import { useCountUpNumber } from "@/hooks/use-count-up";
// import { useOnboarding } from "@/hooks/use-onboarding";
// import { useDemoStore } from "@/store/demo-store";
// import type { Order, OrderStatus, PaymentMethod } from "@/types/demo";
// import { formatINR } from "@/lib/format";
// import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// import { Coins } from "lucide-react"; // Coin icon
// import confetti from "canvas-confetti"; // Game animation
// import { useEffect, useRef } from "react"; // Hooks

// export default function AdminDashboardPage() {
//   useOnboarding();

//   const { state, dispatch } = useDemoStore();
  
//   // --- STATE ---
//   const [details, setDetails] = React.useState<Order | null>(null);
//   const [payment, setPayment] = React.useState<Order | null>(null);
//   const [billOrder, setBillOrder] = React.useState<Order | null>(null);
//   const [addOrderOpen, setAddOrderOpen] = React.useState(false);
//   const [stockOpen, setStockOpen] = React.useState(false);
//   const [query, setQuery] = React.useState("");
//   const [now, setNow] = React.useState<Date>(() => new Date());
//   const [showProfit, setShowProfit] = React.useState(false);
  
//   // Pagination State
//   const [currentPage, setCurrentPage] = React.useState(1);
//   const ITEMS_PER_PAGE = 10;

//   React.useEffect(() => {
//     const id = window.setInterval(() => setNow(new Date()), 1_000);
//     return () => window.clearInterval(id);
//   }, []);

//   // Reset pagination when search query changes
//   React.useEffect(() => {
//     setCurrentPage(1);
//   }, [query]);

//   const todayKey = React.useMemo(() => now.toISOString().slice(0, 10), [now]);

//   // --- LOGIC ---

//   const todaysOrders = React.useMemo(() => {
//     return state.orders.filter(o => o.receivedAt.slice(0, 10) === todayKey);
//   }, [state.orders, todayKey]);

//   const todaysEarningsRaw = React.useMemo(() => {
//     return todaysOrders.filter(o => o.status === "completed" && Boolean(o.paidAt) && !o.isCredit).reduce((sum, o) => sum + o.total, 0);
//   }, [todaysOrders]);

//   // NEW: Profit Calculation Logic
//   const todaysProfitRaw = React.useMemo(() => {
//     return todaysOrders
//       .filter(o => o.status === "completed" && Boolean(o.paidAt) && !o.isCredit)
//       .reduce((totalProfit, order) => {
//         const orderProfit = order.items.reduce((acc, item) => {
//           // Product list se cost price dhundo
//           const product = state.products.find(p => p.id === item.id);
//           const cost = product?.costPrice || 0; 
//           const sellingPrice = item.price; // Order ke time ka price
          
//           // Profit = (Selling - Cost) * Qty
//           return acc + ((sellingPrice - cost) * item.qty);
//         }, 0);
//         return totalProfit + orderProfit;
//       }, 0);
//   }, [todaysOrders, state.products]);

//   // Animation ke liye value switch karo
//   const displayValue = showProfit ? todaysProfitRaw : todaysEarningsRaw;
  
//   const animatedDisplayValue = useCountUpNumber(displayValue, {
//     durationMs: 800 // Thoda fast animation switch ke liye
//   });

//   const todaysEarningsAnimated = useCountUpNumber(todaysEarningsRaw, {
//     durationMs: 1100
//   });

//   // 1. TRACK PREVIOUS EARNINGS TO TRIGGER ANIMATION
//   const prevEarningsRef = useRef(0);

//   useEffect(() => {
//     // Agar nayi earning purani se zyada hai (aur zero nahi hai)
//     if (todaysEarningsRaw > prevEarningsRef.current && prevEarningsRef.current > 0) {
//       // TRIGGER GAME CRACKERS (CONFETTI)
//       const duration = 3 * 1000;
//       const animationEnd = Date.now() + duration;
//       const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

//       const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

//       const interval: any = setInterval(function() {
//         const timeLeft = animationEnd - Date.now();

//         if (timeLeft <= 0) {
//           return clearInterval(interval);
//         }

//         const particleCount = 50 * (timeLeft / duration);
//         // Do jagah se crackers futenge (Left and Right of the screen)
//         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
//         confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
//       }, 250);
//     }
//     // Update ref
//     prevEarningsRef.current = todaysEarningsRaw;
//   }, [todaysEarningsRaw]);

//   // Filtered Orders Logic
//   const filteredOrders = React.useMemo(() => {
//     const q = query.trim().toLowerCase();
//     const base = state.orders
//       .filter(o => o.receivedAt.slice(0, 10) === todayKey)
//       .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      
//     if (!q) return base;
//     return base.filter(o => {
//       const hay = [o.id, o.customerName, o.customerPhone, o.items.map(it => `${it.qty}x ${it.name}`).join(" "), o.source, o.status].join(" ").toLowerCase();
//       return hay.includes(q);
//     });
//   }, [state.orders, query, todayKey]);

//   // Pagination Logic
//   const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
//   const paginatedOrders = React.useMemo(() => {
//     const start = (currentPage - 1) * ITEMS_PER_PAGE;
//     return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
//   }, [filteredOrders, currentPage]);

//   const topSelling = React.useMemo(() => {
//     const qtyByName = new Map<string, number>();
//     for (const o of todaysOrders) {
//       for (const it of o.items) qtyByName.set(it.name, (qtyByName.get(it.name) ?? 0) + it.qty);
//     }
//     return [...qtyByName.entries()].map(([name, qty]) => {
//       const p = state.products.find(x => x.name === name);
//       return {
//         name,
//         qty,
//         imageUrl: p?.imageUrl
//       };
//     }).sort((a, b) => b.qty - a.qty); // Removed slice to show scrolling capability if > 5
//   }, [todaysOrders, state.products]);

//   // Rush Hour Logic (4:30 PM to 2:30 AM)
//   const rushHour = React.useMemo(() => {
//     const counts = new Array(24).fill(0) as number[];
//     for (const o of todaysOrders) counts[new Date(o.receivedAt).getHours()] += 1;
    
//     // Custom Hours Sequence: 16 (4PM) to 23 (11PM) then 0 (12AM) to 2 (2AM)
//     // Using 4:30 PM as base label logic
//     const hoursSequence = [16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2];
    
//     const data: Array<{ hour: string; orders: number }> = [];

//     hoursSequence.forEach((h) => {
//         let label = "";
//         if (h === 0) label = "12:30 AM";
//         else if (h < 12) label = `${h}:30 AM`;
//         else if (h === 12) label = "12:30 PM";
//         else label = `${h - 12}:30 PM`;

//         data.push({
//             hour: label,
//             orders: counts[h]
//         });
//     });

//     return data;
//   }, [todaysOrders]);

//   function itemsSummary(o: Order) {
//     const totalQty = o.items.reduce((s, it) => s + it.qty, 0);
//     const first = o.items[0];
//     if (!first) return "—";
//     const more = o.items.length - 1;
//     return more > 0 ? `${totalQty} items • ${first.name} +${more}` : `${totalQty} items • ${first.name}`;
//   }

//   function statusBadge(status: OrderStatus) {
//     switch (status) {
//       case "new": return <Badge variant="subtle">New</Badge>;
//       case "cooking": return <Badge variant="warning">Cooking</Badge>;
//       case "ready": return <Badge variant="success">Ready</Badge>;
//       case "completed": return <Badge variant="secondary">Completed</Badge>;
//     }
//   }

//   // --- HANDLERS ---
//   const handleMarkPaid = (e: React.MouseEvent, order: Order) => {
//     e.stopPropagation();
//     if (!order.paidAt) {
//       setPayment(order);
//     }
//   };

//   const handlePrint = (e: React.MouseEvent, order: Order) => {
//     e.stopPropagation();
//     setBillOrder(order);
//   }

//   const goToPage = (p: number) => {
//     if (p >= 1 && p <= totalPages) setCurrentPage(p);
//   }

//   return <div className="container space-y-6 pb-10">
      
//      {/* --- HEADER --- */}
//       <section data-tour="earnings" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-elev-1 sm:flex-row sm:items-center sm:justify-between min-h-[100px]">
//         <div>
//           <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
//             {now.toLocaleString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
//           </p>
//           <p className="text-4xl font-bold tracking-tight mt-1">
//              {now.toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
//           </p>
//         </div>

//         <div className="text-left sm:text-right flex flex-col items-end gap-2">
//           {/* PROFIT TOGGLE SWITCH */}
//           <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
//             <Label htmlFor="profit-mode" className="text-xs font-medium cursor-pointer">
//               {showProfit ? "Showing Profit" : "Show Profit"}
//             </Label>
//             <Switch 
//               id="profit-mode" 
//               checked={showProfit} 
//               onCheckedChange={setShowProfit} 
//               className="scale-75 data-[state=checked]:bg-green-600" // Green color when Profit is ON
//             />
//           </div>

//           <div className="flex flex-col items-end">
//             <p className="text-xs text-muted-foreground mb-1">
//               {showProfit ? "Net Profit (Today)" : "Total Revenue (Today)"}
//             </p>
            
//             <div className="flex items-center gap-2">
//               {/* COIN / PROFIT ICON */}
//               <div className="relative">
//                 <div className={`absolute inset-0 rounded-full blur opacity-40 animate-pulse ${showProfit ? "bg-green-400" : "bg-yellow-400"}`}></div>
//                 {showProfit ? (
//                    // Profit Icon (Trending Up)
//                    <BarChart3 className="relative h-8 w-8 text-green-600 fill-green-100 drop-shadow-md" />
//                 ) : (
//                    // Revenue Icon (Coin)
//                    <Coins className="relative h-8 w-8 text-yellow-600 fill-yellow-400 drop-shadow-md" />
//                 )}
//               </div>

//               {/* NUMBER DISPLAY */}
//               <p className={`font-mono text-3xl font-extrabold tracking-tight sm:text-4xl transition-colors duration-300 ${showProfit ? "text-green-600" : "text-foreground"}`}>
//                  {Math.round(animatedDisplayValue).toLocaleString('en-IN')}
//               </p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* --- CONTROLS BAR --- */}
//       <section className="flex flex-col-reverse gap-4 sm:flex-row sm:items-end sm:justify-between">

//         {/* left Side: Search */}
//         <div className="w-full sm:max-w-md">
//           <Label className="sr-only" htmlFor="orders-search">Search orders</Label>
//           <Input 
//             id="orders-search" 
//             value={query} 
//             onChange={e => setQuery(e.target.value)} 
//             placeholder="Search by ID, customer, item..." 
//             className="bg-card shadow-sm"
//           />
//         </div>

//         {/* Right Side: Actions */}
//         <div className="flex flex-wrap items-center gap-2">
//           <Sheet open={stockOpen} onOpenChange={setStockOpen} data-tour="stock-toggle">
//             <SheetTrigger asChild>
//               <Button variant="secondary" size="sm" className="shadow-sm">
//                 <Settings2 className="mr-2 h-4 w-4" />
//                 Manage Stock
//               </Button>
//             </SheetTrigger>
//             <SheetContent side="right" className="w-[360px] sm:w-[420px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
//               <SheetHeader>
//                 <SheetTitle>Stock Management</SheetTitle>
//               </SheetHeader>
//               <div className="mt-4 space-y-3">
//                 {state.products.map(p => <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
//                     <div className="min-w-0">
//                       <p className="truncate text-sm font-medium">{p.name}</p>
//                       <p className="text-xs text-muted-foreground">{formatINR(p.price)}</p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs text-muted-foreground">Out</span>
//                       <Switch checked={Boolean(p.outOfStock)} onCheckedChange={() => dispatch({
//                     type: "TOGGLE_STOCK",
//                     productId: p.id
//                   })} />
//                     </div>
//                   </div>)}
//               </div>
//             </SheetContent>
//           </Sheet>

//           <Button data-tour="add-order" size="sm" variant="success" className="shadow-sm" onClick={() => setAddOrderOpen(true)}>
//             <Plus className="mr-2 h-4 w-4" />
//             Add Order
//           </Button>
//         </div>
//       </section>

//       {/* --- ACTIVE ORDERS TABLE --- */}
//       <section data-tour="orders-table">
//         <Card className="shadow-elev-1 border-t-4 border-t-primary/20">
//           <CardContent className="p-0">
            
//             {/* PAGINATION HEADER */}
//             {totalPages > 1 && (
//                 <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
//                     <p className="text-xs text-muted-foreground">
//                         Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
//                     </p>
//                     <div className="flex items-center gap-1">
//                         <Button 
//                             variant="ghost" 
//                             size="icon" 
//                             className="h-7 w-7" 
//                             disabled={currentPage === 1}
//                             onClick={() => goToPage(currentPage - 1)}
//                         >
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <div className="flex items-center gap-1">
//                             {Array.from({length: totalPages}, (_, i) => i + 1).map(pageNum => (
//                                 <Button
//                                     key={pageNum}
//                                     variant={pageNum === currentPage ? "default" : "ghost"}
//                                     size="sm"
//                                     className={`h-7 w-7 p-0 text-xs ${pageNum === currentPage ? 'bg-primary text-primary-foreground' : ''}`}
//                                     onClick={() => goToPage(pageNum)}
//                                 >
//                                     {pageNum}
//                                 </Button>
//                             ))}
//                         </div>
//                         <Button 
//                             variant="ghost" 
//                             size="icon" 
//                             className="h-7 w-7" 
//                             disabled={currentPage === totalPages}
//                             onClick={() => goToPage(currentPage + 1)}
//                         >
//                             <ChevronRight className="h-4 w-4" />
//                         </Button>
//                     </div>
//                 </div>
//             )}

//             <Table>
//               <TableHeader className="bg-muted/30">
//                 <TableRow>
//                   <TableHead className="w-[28%]">Item Summary</TableHead>
//                   <TableHead>Customer Name</TableHead>
//                   <TableHead className="w-[100px]">Order ID</TableHead>
//                   <TableHead className="w-[110px]">Total</TableHead>
//                   <TableHead className="w-[120px] font-bold text-primary">Arrive At</TableHead> {/* New Column */}
//                   <TableHead className="w-[100px]">Status</TableHead>
//                   <TableHead className="w-[140px]">Action</TableHead>
//                   <TableHead className="w-[80px] text-right">Print</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {paginatedOrders.map(o => (
//                   <TableRow key={o.id} role="button" className="cursor-pointer hover:bg-muted/20" onClick={() => setDetails(o)}>
                    
//                     {/* 1. Item Summary */}
//                     <TableCell className="font-semibold text-foreground">
//                         {itemsSummary(o)}
//                     </TableCell>

//                     {/* 2. Customer Name */}
//                     <TableCell>
//                         <div className="flex flex-col">
//                             <span className="font-medium">{o.customerName || "Walk-in"}</span>
//                             <span className="text-xs text-muted-foreground">{o.customerPhone}</span>
//                         </div>
//                     </TableCell>

//                     {/* 3. Order ID */}
//                     <TableCell className="text-xs text-muted-foreground font-mono">
//                       #{o.id}
//                       {o.source === "zomato" && <Badge variant="destructive" className="ml-2 text-[10px] h-4 px-1">Z</Badge>}
//                     </TableCell>

//                     {/* 4. Total */}
//                     <TableCell className="font-bold text-base">{formatINR(o.total)}</TableCell>

//                     {/* 5. Arrive At (New) */}
//                     <TableCell className="font-medium text-sm">
//                         {/* Placeholder logic since backend isn't updated in this snippet */}
//                         {o.arrivingAt ? (
//     <div className="flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit text-xs border border-blue-200">
//       {/* 24h Time string (HH:mm) ko 12h format main dikhane ka simple logic */}
//       {new Date(`1970-01-01T${o.arrivingAt}`).toLocaleTimeString([], { 
//         hour: '2-digit', 
//         minute: '2-digit',
//         hour12: true 
//       })}
//     </div>
//   ) : (
//     <div className="flex items-center text-orange-700 bg-orange-50 px-2 py-1 rounded-md w-fit text-xs border border-orange-200">
//       ASAP
//     </div>
//   )}
//                         {/* <div className="flex items-center text-orange-700 bg-orange-50 px-2 py-1 rounded-md w-fit text-xs">
//                            As Soon As
//                         </div> */}
//                     </TableCell>

//                     {/* 6. Status */}
//                     <TableCell>{statusBadge(o.status)}</TableCell>

//                     {/* 7. Action */}
//                     <TableCell>
//                         <Button 
//                             size="sm" 
//                             variant={o.paidAt ? "ghost" : "outline"} 
//                             className={o.paidAt ? "text-green-600 cursor-not-allowed opacity-100" : "border-green-600 text-green-700 hover:bg-green-50"}
//                             disabled={Boolean(o.paidAt)}
//                             onClick={(e) => handleMarkPaid(e, o)}
//                         >
//                             {o.paidAt ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Paid</> : "Mark Paid"}
//                         </Button>
//                     </TableCell>

//                     {/* 8. Print */}
//                     <TableCell className="text-right">
//                         <Button size="icon" variant="ghost" onClick={(e) => handlePrint(e, o)}>
//                             <Printer className="w-4 h-4 text-muted-foreground" />
//                         </Button>
//                     </TableCell>

//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>

//             {filteredOrders.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No orders found.</div> : null}
//           </CardContent>
//         </Card>
//       </section>

//       {/* --- ANALYTICS SECTION --- */}
//       <section data-tour="analytics" className="grid gap-4 lg:grid-cols-2">
//         <Card className="shadow-elev-1">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-base">🏆 Top Selling Items Today</CardTitle>
//           </CardHeader>
//           <CardContent>
//             {/* Added scroll container with hidden scrollbar */}
//             <div className="space-y-4 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
//                 {topSelling.length === 0 ? (
//                 <div className="text-sm text-muted-foreground">No sales data yet.</div>
//                 ) : (
//                 topSelling.map((it, idx) => (
//                     <div key={it.name} className="flex items-center gap-3">
//                     <div className="w-8 text-lg font-semibold text-muted-foreground">{idx + 1}</div>
//                     <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted shrink-0">
//                         {it.imageUrl ? (
//                         <img src={it.imageUrl} alt={`${it.name} thumbnail`} className="h-full w-full object-cover" loading="lazy" />
//                         ) : (
//                         <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">No image</div>
//                         )}
//                     </div>
//                     <div className="min-w-0 flex-1">
//                         <div className="truncate font-semibold">{it.name}</div>
//                         <div className="text-xs text-muted-foreground">
//                         Sold today: {it.qty} • Revenue: {formatINR(it.qty * (state.products.find(p => p.name === it.name)?.price ?? 0))}
//                         </div>
//                     </div>
//                     </div>
//                 ))
//                 )}
//             </div>
//             {/* Removed "See More" link as we now scroll */}
//           </CardContent>
//         </Card>

//         <Card className="shadow-elev-1">
//           <CardHeader className="pb-2">
//             <CardTitle className="text-base">⏰ Peak Rush Hours (4:30 PM - 2:30 AM)</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="h-[280px] w-full"> {/* Increased height slightly */}
//               <ResponsiveContainer width="100%" height="100%">
//                 <BarChart data={rushHour} layout="vertical" margin={{ left: 35, right: 16, top: 8, bottom: 8 }}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  
//                   {/* Y Axis is Time (Categories) */}
//                   <YAxis 
//                     type="category" 
//                     dataKey="hour" 
//                     tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
//                     axisLine={false} 
//                     tickLine={false} 
//                     width={60}
//                   />

//                   {/* X Axis is Orders (Number) */}
//                   <XAxis 
//                     type="number" 
//                     tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
//                     axisLine={false} 
//                     tickLine={false} 
//                   />
                  
//                   <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
//                   <Bar dataKey="orders" radius={[0, 4, 4, 0]}>
//                     {rushHour.map((entry, index) => {
//                       const max = Math.max(...rushHour.map((r) => r.orders));
//                       const isPeak = entry.orders === max && max > 0;
//                       return <Cell key={`cell-${index}`} fill={isPeak ? "hsl(var(--warning))" : "hsl(var(--accent))"} />;
//                     })}
//                   </Bar>
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </CardContent>
//         </Card>
//       </section>

//       {/* --- ORDER DETAILS MODAL --- */}
//       <Dialog open={Boolean(details)} onOpenChange={o => !o && setDetails(null)}>
//         <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh] [&::-webkit-scrollbar]:hidden">
//           <DialogHeader>
//             <DialogTitle>Order details</DialogTitle>
//             <DialogDescription>Review order information.</DialogDescription>
//           </DialogHeader>
//           {details && <div className="grid gap-4 md:grid-cols-2">
//               <div className="rounded-xl border bg-muted/30 p-4">
//                 <p className="text-sm font-semibold">Customer</p>
//                 <p className="mt-2 text-sm">{details.customerName}</p>
//                 <p className="text-sm text-muted-foreground">{details.customerPhone}</p>
//                 {details.specialInstructions ? <p className="mt-3 text-sm text-muted-foreground">“{details.specialInstructions}”</p> : <p className="mt-3 text-sm text-muted-foreground">No special instructions.</p>}

//                 <Separator className="my-3" />
//                 <div className="flex flex-wrap items-center gap-2">
//                   <Badge variant="subtle">{details.source === "zomato" ? "Zomato" : "Walk-in"}</Badge>
//                   {statusBadge(details.status)}
//                 </div>
//               </div>
//               <div className="rounded-xl border bg-card p-4 shadow-elev-1">
//                 <p className="text-sm font-semibold">Items</p>
//                 <Separator className="my-3" />
//                 <div className="space-y-2">
//                   {details.items.map(it => <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
//                       <div className="min-w-0">
//                         <p className="truncate font-medium">{it.name}</p>
//                         <p className="text-xs text-muted-foreground">{it.qty} × {formatINR(it.price)}</p>
//                       </div>
//                       <p className="font-semibold">{formatINR(it.qty * it.price)}</p>
//                     </div>)}
//                 </div>
//                 <Separator className="my-3" />
//                 <div className="flex items-center justify-between">
//                   <p className="text-sm text-muted-foreground">Total</p>
//                   <p className="text-lg font-semibold">{formatINR(details.total)}</p>
//                 </div>
//               </div>
//             </div>}
//           <DialogFooter>
//             {details ? <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
//                 <Button variant="secondary" onClick={() => setDetails(null)}>
//                   Close
//                 </Button>

//                 <div className="flex flex-col gap-2 sm:flex-row">
//                    <Button 
//                       variant="success" 
//                       disabled={Boolean(details.paidAt)}
//                       onClick={() => setPayment(details)}
//                     >
//                       {details.paidAt ? "Paid" : "Mark Paid"}
//                     </Button>
//                 </div>
//               </div> : <Button variant="secondary" onClick={() => setDetails(null)}>
//                 Close
//               </Button>}
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* --- PAYMENT MODAL --- */}
//       <PaymentDialog open={Boolean(payment)} order={payment} onOpenChange={o => !o && setPayment(null)} />

//       {/* --- BILL PRINT SHEET --- */}
//       <Sheet open={Boolean(billOrder)} onOpenChange={(o) => !o && setBillOrder(null)}>
//         <SheetContent className="w-[400px] sm:w-[450px] bg-zinc-50 overflow-y-auto [&::-webkit-scrollbar]:hidden">
//             <SheetHeader>
//                 <SheetTitle className="text-center border-b pb-4">Order Receipt</SheetTitle>
//             </SheetHeader>
//             {billOrder && (
//                 <div className="mt-6 px-2 font-mono text-sm space-y-4">
//                     {/* Bill content same as before... */}
//                     <div className="text-center space-y-1">
//                         <h2 className="text-xl font-bold uppercase tracking-widest">Arabian Nights</h2>
//                         <p className="text-xs text-muted-foreground">Taste of Authenticity</p>
//                         <p className="text-xs text-muted-foreground">www.eatnbill.com</p>
//                     </div>

//                     <div className="border-t border-b border-dashed border-gray-300 py-3 space-y-1">
//                          <div className="flex justify-between">
//                             <span>Date: {new Date().toLocaleDateString()}</span>
//                             <span>Time: {new Date().toLocaleTimeString()}</span>
//                          </div>
//                          <div className="flex justify-between">
//                             <span>Order #: {billOrder.id}</span>
//                             <span>{billOrder.source === 'zomato' ? 'ZOMATO' : 'DINE-IN'}</span>
//                          </div>
//                          <div className="flex justify-between font-bold">
//                             <span>Customer:</span>
//                             <span>{billOrder.customerName || "Guest"}</span>
//                          </div>
//                          {/* Mock Arriving Time in Bill */}
//                          <div className="flex justify-between">
//                             <span>Arrive At:</span>
//                             <span>ASAP</span>
//                          </div>
//                     </div>

//                     <div className="space-y-2 py-2">
//                         <div className="flex font-bold border-b pb-1">
//                             <span className="flex-1">Item</span>
//                             <span className="w-8 text-center">Qty</span>
//                             <span className="w-16 text-right">Price</span>
//                         </div>
//                         {billOrder.items.map((item, i) => (
//                             <div key={i} className="flex">
//                                 <span className="flex-1 truncate">{item.name}</span>
//                                 <span className="w-8 text-center">{item.qty}</span>
//                                 <span className="w-16 text-right">{formatINR(item.price * item.qty)}</span>
//                             </div>
//                         ))}
//                     </div>

//                     <div className="border-t border-gray-800 pt-2 space-y-2">
//                          <div className="flex justify-between text-lg font-bold">
//                             <span>TOTAL</span>
//                             <span>{formatINR(billOrder.total)}</span>
//                          </div>
//                          <div className="flex justify-between text-xs text-muted-foreground">
//                             <span>Payment Status:</span>
//                             <span className="uppercase">{billOrder.paidAt ? "PAID" : "UNPAID"}</span>
//                          </div>
//                     </div>

//                     <div className="text-center pt-8 space-y-2">
//                         <p className="text-xs">*** THANK YOU FOR VISITING ***</p>
//                         <Button className="w-full mt-4 bg-black text-white hover:bg-gray-800" onClick={() => window.print()}>
//                             <Printer className="w-4 h-4 mr-2" /> Print Receipt
//                         </Button>
//                     </div>
//                 </div>
//             )}
//         </SheetContent>
//       </Sheet>

//       {/* Manual order */}
//       <AddManualOrderDialog open={addOrderOpen} onOpenChange={setAddOrderOpen} />
//     </div>;
// }

// function PaymentDialog({
//   open,
//   order,
//   onOpenChange
// }: {
//   open: boolean;
//   order: Order | null;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const { state, dispatch } = useDemoStore();
//   const [method, setMethod] = React.useState<PaymentMethod>(state.ui.lastPaymentMethod);
//   const [isCredit, setIsCredit] = React.useState(false);
//   const [creditAmount, setCreditAmount] = React.useState(0);
//   React.useEffect(() => {
//     if (!order) return;
//     setMethod(state.ui.lastPaymentMethod);
//     setIsCredit(Boolean(order.isCredit));
//     setCreditAmount(order.creditAmount || order.total);
//   }, [order, state.ui.lastPaymentMethod]);
//   return <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="max-w-lg">
//         <DialogHeader>
//           <DialogTitle>Payment</DialogTitle>
//           <DialogDescription>Confirm payment or mark as credit (udhar).</DialogDescription>
//         </DialogHeader>

//         {order && <div className="space-y-4">
//             <div className="rounded-xl border bg-muted/30 p-4">
//               <div className="flex items-center justify-between">
//                 <p className="text-sm font-medium">Amount</p>
//                 <p className="text-lg font-semibold">{formatINR(order.total)}</p>
//               </div>
//               <p className="mt-1 text-xs text-muted-foreground">Order {order.id}</p>
//             </div>

//             <div className="grid gap-4">
//               <div className="space-y-2">
//                 <Label>Payment method</Label>
//                 <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select method" />
//                   </SelectTrigger>
//                   <SelectContent className="z-50">
//                     <SelectItem value="cash">Cash</SelectItem>
//                     <SelectItem value="card">Card</SelectItem>
//                     <SelectItem value="online">Online</SelectItem>
//                     <SelectItem value="other">Other</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="flex items-center justify-between rounded-xl border bg-background p-3">
//                 <div>
//                   <p className="text-sm font-medium">Udhar (credit)</p>
//                   <p className="text-xs text-muted-foreground">Mark unpaid and track in analytics.</p>
//                 </div>
//                 <Switch checked={isCredit} onCheckedChange={v => setIsCredit(Boolean(v))} />
//               </div>

//               {isCredit && <div className="space-y-2">
//                   <Label>Credit amount</Label>
//                   <Input value={String(creditAmount)} onChange={e => setCreditAmount(Number(e.target.value || 0))} inputMode="numeric" />
//                 </div>}
//             </div>
//           </div>}

//         <DialogFooter>
//           <Button variant="secondary" onClick={() => onOpenChange(false)}>
//             Cancel
//           </Button>
//           <Button variant={isCredit ? "warning" : "success"} onClick={() => {
//           if (!order) return;
//           dispatch({
//             type: "SET_PAYMENT",
//             orderId: order.id,
//             at: new Date().toISOString(),
//             method,
//             isCredit,
//             creditAmount: isCredit ? creditAmount : 0
//           });
//           onOpenChange(false);
//         }}>
//             {isCredit ? "Confirm credit" : "Confirm payment"}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>;
// }