import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Printer, ChevronLeft, ChevronRight, Trash2, RotateCcw, MapPin } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/demo";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderTableProps {
    orders: Order[];
    totalPages: number;
    currentPage: number;
    onPageChange: (p: number) => void;
    onRowClick: (o: Order) => void;
    onMarkPaid: (e: React.MouseEvent, o: Order) => void;
    onPrint: (e: React.MouseEvent, o: Order) => void; // Print Handler
    onDelete: (e: React.MouseEvent, o: Order) => void;
}

function itemsSummary(o: Order) {
    const totalQty = o.items.reduce((s, it) => s + it.qty, 0);
    const first = o.items[0];
    if (!first) return "—";
    const more = o.items.length - 1;
    return more > 0 ? `${totalQty} items • ${first.name} +${more}` : `${totalQty} items • ${first.name}`;
}

function statusBadge(status: OrderStatus) {
    switch (status) {
        case "new": return <Badge variant="subtle" className="bg-blue-100 text-blue-700 hover:bg-blue-200">New</Badge>;
        case "cooking": return <Badge variant="warning" className="animate-pulse">Cooking</Badge>;
        case "ready": return <Badge variant="success">Ready</Badge>;
        case "completed": return <Badge variant="secondary">Completed</Badge>;
        case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
}

function SourceBadge({ source }: { source: string }) {
    switch (source?.toLowerCase()) {
        case 'zomato':
            return <Badge className="bg-red-600 hover:bg-red-700 text-white border-none px-2">Zomato</Badge>;
        case 'swiggy':
            return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none px-2">Swiggy</Badge>;
        default:
            return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50"><MapPin className="w-3 h-3 mr-1" /> Walk-in</Badge>;
    }
}

export function OrderTable({ orders, totalPages, currentPage, onPageChange, onRowClick, onMarkPaid, onPrint, onDelete }: OrderTableProps) {

    const sortedOrders = React.useMemo(() => {
        return [...orders].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    }, [orders]);

    return (
        <Card className="shadow-elev-1 border-t-4 border-t-primary/20">
            <CardContent className="p-0">

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
                        <p className="text-xs text-muted-foreground font-medium">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}

                <div className="w-full overflow-auto [&::-webkit-scrollbar]:hidden">
                    <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                            <TableRow>
                                {/* ✅ 1. ORDER ID */}
                                <TableHead className="w-[100px]">Order ID</TableHead>

                                {/* ✅ 2. ITEM SUMMARY */}
                                <TableHead className="w-[25%]">Item Summary</TableHead>

                                {/* ✅ 3. SOURCE */}
                                <TableHead className="w-[100px]">Source</TableHead>

                                <TableHead>Customer</TableHead>
                                <TableHead className="w-[100px] text-right">Total</TableHead>
                                <TableHead className="w-[120px] font-bold text-primary text-center">Arrive At</TableHead>
                                <TableHead className="w-[100px] text-center">Status</TableHead>
                                <TableHead className="w-[120px] text-center">Payment</TableHead>
                                <TableHead className="w-[80px] text-right">Print</TableHead>
                                <TableHead className="w-[60px] text-right">Del</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedOrders.map(o => {
                                const isReorder = o.specialInstructions?.toLowerCase().includes("reorder");

                                return (
                                    <TableRow
                                        key={o.id}
                                        role="button"
                                        className={`cursor-pointer transition-colors border-b hover:bg-blue-50/50 ${isReorder ? "bg-yellow-50/80 hover:bg-yellow-100" : ""}`}
                                        onClick={() => onRowClick(o)}
                                    >
                                        {/* 1. Order ID */}
                                        <TableCell className="text-xs text-muted-foreground font-mono font-medium">
                                            #{o.id}
                                            {isReorder && (
                                                <div className="flex items-center text-[10px] text-orange-700 mt-1 font-bold animate-pulse">
                                                    <RotateCcw className="h-3 w-3 mr-1" /> Reorder
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* 2. Items */}
                                        <TableCell className="font-semibold text-foreground text-sm">
                                            {itemsSummary(o)}
                                        </TableCell>

                                        {/* 3. Source */}
                                        <TableCell>
                                            <SourceBadge source={o.source} />
                                        </TableCell>

                                        {/* Customer */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{o.customerName || "Guest"}</span>
                                                <span className="text-[11px] text-muted-foreground font-mono">{o.customerPhone}</span>
                                            </div>
                                        </TableCell>

                                        {/* Total */}
                                        <TableCell className="font-bold text-base text-right">{formatINR(o.total)}</TableCell>

                                        {/* Arrive At */}
                                        <TableCell className="text-center">
                                            {o.arrivingAt ? (
                                                <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
                                                    {new Date(`1970-01-01T${o.arrivingAt}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-orange-700 bg-orange-50 px-2 py-1 rounded-md text-xs font-medium border border-orange-200">
                                                    ASAP
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Status */}
                                        <TableCell className="text-center">{statusBadge(o.status)}</TableCell>

                                        {/* Payment */}
                                        <TableCell className="text-center">
                                            <Button
                                                size="sm"
                                                variant={o.paidAt ? "ghost" : "outline"}
                                                className={`h-7 text-xs ${o.paidAt ? "text-green-600 hover:text-green-700" : "border-green-600 text-green-700 hover:bg-green-50"}`}
                                                disabled={Boolean(o.paidAt)}
                                                onClick={(e) => onMarkPaid(e, o)}
                                            >
                                                {o.paidAt ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Paid</> : "Mark Paid"}
                                            </Button>
                                        </TableCell>

                                        {/* ✅ Print Action */}
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={(e) => onPrint(e, o)} title="Print Bill">
                                                <Printer className="w-4 h-4" />
                                            </Button>
                                        </TableCell>

                                        {/* Delete Action */}
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50" onClick={(e) => e.stopPropagation()} title="Delete Order">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Order #{o.id}?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => onDelete(e, o)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {orders.length === 0 && <div className="py-16 text-center">
                        <p className="text-lg font-semibold text-muted-foreground">No active orders</p>
                        <p className="text-sm text-muted-foreground">Ready for the rush! 🚀</p>
                    </div>}
                </div>
            </CardContent>
        </Card>
    );
}