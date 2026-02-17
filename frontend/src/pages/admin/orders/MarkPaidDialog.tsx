/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAdminOrdersStore } from '@/stores/orders';
import { formatINR } from '@/lib/format';
import type { Order, PaymentMethod } from '@/types/order';
import { motion } from 'framer-motion';
import {
    Wallet,
    CheckCircle2,
    X,
    CreditCard,
    Banknote,
    QrCode,
    ArrowRight,
    Sparkles,
    UserPlus,
    Undo2,
    Check,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurantStore } from '@/stores/restaurant';
import { Checkbox } from '@/components/ui/checkbox';
import { printBill } from '@/lib/print-utils';

interface MarkPaidDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash Payment', icon: Banknote, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { value: 'UPI', label: 'UPI / QR Scan', icon: QrCode, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { value: 'CARD', label: 'Card Payment', icon: CreditCard, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { value: 'OTHER', label: 'Bank Transfer', icon: Wallet, color: 'text-amber-500', bgColor: 'bg-amber-50' },
];

export default function MarkPaidDialog({ order, open, onOpenChange }: MarkPaidDialogProps) {
    const { updatePayment, updating } = useAdminOrdersStore();
    const { restaurant } = useRestaurantStore();
    const [method, setMethod] = useState<PaymentMethod | ''>('UPI');
    const [isCreditView, setIsCreditView] = useState(false);
    const [autoPrint, setAutoPrint] = useState(false);
    const [discount, setDiscount] = useState<string>('');

    useEffect(() => {
        if (open && order) {
            setDiscount(order.discount_amount ? String(order.discount_amount) : '');
            setMethod('UPI');
            setAutoPrint(false);
            setIsCreditView(false);
        }
    }, [open, order]);

    const baseTotal = order ? (parseFloat(order.total_amount) + parseFloat(order.discount_amount || '0')) : 0;
    const currentDiscount = parseFloat(discount) || 0;
    const finalPayable = Math.max(0, baseTotal - currentDiscount);

    const handleRevertPayment = async () => {
        if (!order) return;

        const fallbackMethod = (order.payment_method || 'CASH') as PaymentMethod;
        try {
            await updatePayment(order.id, {
                payment_status: 'PENDING',
                payment_method: fallbackMethod,
                payment_amount: parseFloat(order.total_amount),
            });
            onOpenChange(false);
            setMethod('UPI');
            setIsCreditView(false);
        } catch (error) {
            console.error('Failed to revert payment:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        const currentMethod = isCreditView ? 'CREDIT' : method;
        if (!currentMethod) return;

        try {
            await updatePayment(order.id, {
                payment_status: isCreditView ? 'PENDING' : 'PAID',
                payment_method: currentMethod as PaymentMethod,
                payment_amount: finalPayable,
                discount_amount: currentDiscount,
            });

            if (autoPrint && !isCreditView) {
                const updatedOrder = {
                    ...order,
                    payment_status: 'PAID' as any,
                    payment_method: currentMethod as any,
                    total_amount: String(finalPayable),
                    discount_amount: String(currentDiscount),
                };
                printBill(updatedOrder, restaurant?.name || "Restaurant");
            }

            onOpenChange(false);
            setMethod('UPI');
            setIsCreditView(false);
        } catch (error) {
            console.error('Failed to update payment:', error);
        }
    };

    if (!order) return null;

    const isPaid = order.payment_status === 'PAID';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl mx-auto flex flex-col max-h-[86vh]">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    {/* Clean Header */}
                    <div className={cn(
                        "p-4 sm:p-5 pb-6 text-white relative",
                        isPaid ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                            isCreditView ? "bg-gradient-to-br from-orange-500 to-amber-600" :
                                "bg-gradient-to-br from-slate-800 to-slate-900"
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight">
                                {isPaid ? 'Payment Confirmed' : isCreditView ? 'Credit Sale' : 'Settle Payment'}
                            </DialogTitle>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8 rounded-full text-white/50 hover:text-white hover:bg-white/10"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <DialogDescription className="text-white/80 text-xs sm:text-sm font-bold flex items-center gap-2">
                            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs tracking-wider">#{order.order_number}</span>
                            <span className="truncate">{order.customer_name}</span>
                        </DialogDescription>
                    </div>

                    <div className="px-4 sm:px-5 py-4 -mt-3 bg-white rounded-t-[2rem] relative z-20 flex-1 overflow-y-auto space-y-4">
                        {isPaid ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3 pt-1"
                            >
                                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center gap-3">
                                    <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
                                        <CheckCircle2 className="h-10 w-10" />
                                    </div>
                                    <h4 className="font-black text-slate-900 text-lg">Transaction Complete</h4>
                                    <p className="text-xs text-slate-500 font-medium px-4">
                                        The payment of <span className="text-emerald-600 font-black">{formatINR(parseFloat(order.total_amount))}</span> was split and recorded via <span className="font-bold underline">{order.payment_method}</span>.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRevertPayment}
                                    disabled={updating}
                                    className="w-full h-12 rounded-xl border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold gap-2"
                                >
                                    <Undo2 className="h-4 w-4" />
                                    Revert to Unpaid
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                                <div className="space-y-4">
                                    {/* Step 1: Select Method */}
                                    {!isCreditView && (
                                        <div className="space-y-2">
                                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Method</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {PAYMENT_METHODS.map((pm) => {
                                                    const selected = method === pm.value;
                                                    return (
                                                        <button
                                                            key={pm.value}
                                                            type="button"
                                                            onClick={() => setMethod(pm.value as PaymentMethod)}
                                                            className={cn(
                                                                "h-11 rounded-xl border px-3 flex items-center gap-2 text-left transition-all",
                                                                selected
                                                                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                                            )}
                                                        >
                                                            <div className={cn("p-1.5 rounded-lg", pm.bgColor, pm.color)}>
                                                                <pm.icon className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-xs font-bold">{pm.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Step 2: Credit Toggle */}
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Credit Option</Label>
                                        {!isCreditView ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsCreditView(true)}
                                                className="w-full h-11 rounded-xl border-orange-100 bg-orange-50/20 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all font-bold gap-2 text-xs"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Move to Customer Credit
                                            </Button>
                                        ) : (
                                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-2">
                                                <div className="flex items-center gap-2 text-orange-800">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-xs font-black uppercase tracking-tight">Credit Mode Active</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setIsCreditView(false)}
                                                    className="w-full h-8 rounded-lg text-orange-600 hover:bg-orange-100 font-bold text-[10px]"
                                                >
                                                    Switch to Direct Payment
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 3: Discount & Summary */}
                                <div className="space-y-3">
                                    <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 shadow-inner">
                                        <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                                            <span>ORDER TOTAL</span>
                                            <span className="text-slate-900">{formatINR(baseTotal)}</span>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 py-1">
                                            <Label htmlFor="discount" className="text-xs text-rose-500 font-black flex items-center gap-1.5 uppercase tracking-wider">
                                                <Sparkles className="h-3 w-3" /> Discount
                                            </Label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                                                <Input
                                                    id="discount"
                                                    type="number"
                                                    value={discount}
                                                    onChange={(e) => setDiscount(e.target.value)}
                                                    className="h-10 w-28 pl-6 text-right text-sm font-black border-slate-200 bg-white rounded-xl focus:border-rose-300 focus:ring-rose-100 transition-all"
                                                    min={0}
                                                    max={baseTotal}
                                                />
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200/50 my-2" />

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Final Payable</p>
                                                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                                    {formatINR(finalPayable)}
                                                </p>
                                            </div>
                                            {!isCreditView && (
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-primary transition-all group">
                                                        <Checkbox
                                                            id="auto-print"
                                                            checked={autoPrint}
                                                            onCheckedChange={(c) => setAutoPrint(!!c)}
                                                            className="data-[state=checked]:bg-primary border-slate-300"
                                                        />
                                                        <Label htmlFor="auto-print" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">Print Bill</Label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2 shrink-0">
                        {!isPaid && (
                            <Button
                                type="submit"
                                disabled={updating || (!method && !isCreditView)}
                                className={cn(
                                    "w-full h-12 rounded-xl font-black transition-all shadow-xl text-base gap-2",
                                    isCreditView
                                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-100"
                                        : "bg-slate-900 hover:bg-black text-white shadow-slate-200"
                                )}
                            >
                                {updating ? (
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                ) : (
                                    <div className="bg-white/20 p-1.5 rounded-lg">
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                )}
                                {updating ? 'Processing...' : isCreditView ? 'Confirm Credit Sale' : 'Complete Settlement'}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={updating}
                            className="w-full text-slate-500 font-bold hover:bg-slate-200/50 rounded-xl h-12 text-sm"
                        >
                            Dismiss
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog >
    );
}
