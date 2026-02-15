import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { User, Phone, MapPin, Clock, FileText, Wallet, Hash, Utensils, ReceiptText, X, Printer as PrinterIcon, Sparkles } from 'lucide-react';
import type { Order } from '@/types/order';
import { formatINR } from '@/lib/format';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// We import Button and Badge separately since they are not exported from @/components/ui/dialog
import { Button as UIButton } from '@/components/ui/button';
import { Badge as UIBadge } from '@/components/ui/badge';

interface OrderDetailsDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMarkPaid: (order: Order) => void;
    onReversePayment?: (order: Order) => void;
}

export default function OrderDetailsDialog({ order, open, onOpenChange, onMarkPaid, onReversePayment }: OrderDetailsDialogProps) {
    if (!order) return null;

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'PLACED': return 'bg-blue-500 text-white shadow-blue-100';
            case 'CONFIRMED': return 'bg-purple-500 text-white shadow-purple-100';
            case 'PREPARING': return 'bg-orange-500 text-white shadow-orange-100';
            case 'READY': return 'bg-emerald-500 text-white shadow-emerald-100';
            case 'COMPLETED': return 'bg-indigo-400 text-white shadow-indigo-100';
            case 'CANCELLED': return 'bg-rose-500 text-white shadow-rose-100';
            default: return 'bg-slate-400 text-white';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-5xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white flex flex-col [&>button:last-child]:hidden">

                {/* Custom Close Button */}
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute top-4 right-6 z-[100] h-10 w-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center text-indigo-500 hover:text-indigo-700 transition-all shadow-sm border border-indigo-100"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header: Minimalist Style */}
                <div className="bg-white px-6 py-3.5 border-b border-indigo-50 shrink-0 relative overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md rotate-1">
                                <Hash className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle asChild>
                                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Order #{order.order_number}</h2>
                                </DialogTitle>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-indigo-400 font-bold text-[8px] uppercase tracking-widest">
                                        <Clock className="w-2.5 h-2.5" />
                                        {format(new Date(order.placed_at || order.created_at), 'hh:mm a')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pr-12">
                            <UIBadge className={cn("px-3 py-1 rounded-md font-black uppercase tracking-widest text-[8px] border-none", getStatusStyles(order.status))}>
                                {order.status}
                            </UIBadge>
                        </div>
                    </div>
                </div>

                <div className="flex h-[60vh] overflow-hidden bg-slate-50/20">
                    {/* Left Column: Pure Order Manifest (No Headers/Footers) */}
                    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar p-6 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {order.items.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-50 hover:border-indigo-50 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center font-black text-slate-900 text-[11px] group-hover:bg-indigo-600 group-hover:text-white transition-all italic tracking-tighter">
                                            {item.quantity}×
                                        </div>
                                        <div className="min-w-0 flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-800 text-sm tracking-tight truncate leading-none uppercase">{item.name_snapshot}</p>
                                                {/* Item Status Badge */}
                                                {(item as any).status === 'SERVED' ? (
                                                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                                        Served
                                                    </span>
                                                ) : (item as any).status === 'CANCELLED' ? (
                                                    <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                                        Cancelled
                                                    </span>
                                                ) : (item as any).status === 'REORDER' ? (
                                                    <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                                                        Re-Order
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-50 text-blue-500 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-blue-100">
                                                        {order.status === 'PREPARING' ? 'Cooking' : order.status === 'READY' ? 'Ready' : 'Pending'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatINR(parseFloat(item.price_snapshot))}</p>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4 shrink-0">
                                        <p className="text-sm font-black text-slate-900 tracking-tight">{formatINR(parseFloat(item.price_snapshot) * item.quantity)}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Right Rail: Interaction & Details (Ultra-Compact) */}
                    <div className="w-[280px] bg-white border-l border-indigo-50 p-4 flex flex-col gap-4 overflow-hidden">

                        {/* Guest & Info Section */}
                        <div className="space-y-3">
                            <div className="space-y-1 px-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-indigo-400" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Guest</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none rounded-md text-[8px] font-black h-4 px-1.5">
                                        {order.items.length} ITEMS
                                    </Badge>
                                </div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{order.customer_name}</p>
                                <p className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider">{order.customer_phone || 'ANONYMOUS'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 px-1 border-t border-slate-50 pt-3">
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black uppercase text-slate-400 block tracking-tighter">Source</span>
                                    <p className="text-[9px] font-extrabold text-slate-700 uppercase">{order.source}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[7px] font-black uppercase text-slate-400 block tracking-tighter">Station</span>
                                    <p className="text-[9px] font-extrabold text-slate-700 uppercase">Table {order.table_number || 'TBA'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Settlement Card - Shrunk */}
                        <div className={cn(
                            "rounded-xl p-3 border shadow-sm",
                            order.payment_status === 'PAID' ? "bg-emerald-50/20 border-emerald-100/50" : "bg-rose-50/20 border-rose-100/50"
                        )}>
                            <div className="flex justify-between items-center mb-1">
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest",
                                    order.payment_status === 'PAID' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                                )}>
                                    {order.payment_status}
                                </span>
                                {order.payment_method && <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">{order.payment_method}</span>}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Final Amount</span>
                                <h3 className={cn("text-2xl font-black italic tracking-tighter leading-none", order.payment_status === 'PAID' ? "text-emerald-700" : "text-rose-700")}>
                                    {formatINR(parseFloat(order.total_amount))}
                                </h3>
                            </div>
                        </div>

                        {/* Order Notes - Minimal */}
                        {order.notes && (
                            <div className="px-1 max-h-16 overflow-hidden">
                                <p className="text-[8px] font-medium text-slate-400 italic leading-tight line-clamp-2">
                                    Note: {order.notes}
                                </p>
                            </div>
                        )}

                        {/* Single-Row Action Footer */}
                        <div className="mt-auto pt-2 flex items-center gap-2">
                            <UIButton variant="outline" className="h-10 w-10 shrink-0 rounded-lg text-indigo-500 border-indigo-50 hover:bg-indigo-50 transition-all" onClick={() => window.print()}>
                                <PrinterIcon className="w-3.5 h-3.5" />
                            </UIButton>

                            {order.payment_status === 'PENDING' && !['CANCELLED'].includes(order.status) && (
                                <UIButton
                                    onClick={() => onMarkPaid(order)}
                                    className="flex-1 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] shadow-md shadow-indigo-100 transition-all border-none relative overflow-hidden group"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                                        Authorize Settlement
                                    </span>
                                    <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-700 pointer-events-none" />
                                </UIButton>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
