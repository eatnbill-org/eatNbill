import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAdminOrdersStore } from '@/stores/orders';
import { formatINR } from '@/lib/format';
import type { Order, PaymentMethod } from '@/types/order';
import { motion, AnimatePresence } from 'framer-motion';
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
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
    const [method, setMethod] = useState<PaymentMethod | ''>('');
    const [isCreditView, setIsCreditView] = useState(false);

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
            setMethod('');
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
                payment_amount: parseFloat(order.total_amount),
            });
            onOpenChange(false);
            setMethod('');
            setIsCreditView(false);
        } catch (error) {
            console.error('Failed to update payment:', error);
        }
    };

    if (!order) return null;

    const totalAmount = parseFloat(order.total_amount);
    const isPaid = order.payment_status === 'PAID';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <form onSubmit={handleSubmit} className="flex flex-col">
                    {/* Premium Header */}
                    <div className={cn(
                        "p-6 pb-8 text-white relative overflow-hidden",
                        isPaid ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
                            isCreditView ? "bg-gradient-to-br from-orange-500 to-amber-600" :
                                "bg-gradient-to-br from-slate-800 to-slate-900"
                    )}>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 opacity-80">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Settlement Portal</span>
                            </div>
                            <DialogTitle className="text-2xl font-black tracking-tight mb-1">
                                {isPaid ? 'Payment Received' : isCreditView ? 'Credit Issuance' : 'Settle Order'}
                            </DialogTitle>
                            <DialogDescription className="text-white/70 text-xs font-medium">
                                Order #{order.order_number} • {order.customer_name}
                            </DialogDescription>
                        </div>

                        {/* Decorative Background Icon */}
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Wallet size={120} strokeWidth={1} />
                        </div>
                    </div>

                    <div className="px-6 py-8 -mt-4 bg-white rounded-t-[2rem] relative z-20 space-y-6">
                        {/* Amount Card */}
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payable Amount</span>
                                <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                    {formatINR(totalAmount)}
                                </span>
                            </div>
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shadow-inner",
                                isPaid ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                            )}>
                                {isPaid ? <CheckCircle2 className="h-6 w-6" /> : <Banknote className="h-6 w-6" />}
                            </div>
                        </div>

                        {isPaid ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                                    <div className="mt-0.5 bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                                        <Check className="h-3 w-3" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-900 italic">Confirmed via {order.payment_method}</p>
                                        <p className="text-[11px] text-emerald-700 font-medium leading-relaxed opacity-80 mt-1">
                                            This transaction has been successfully recorded in the audit logs.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleRevertPayment}
                                    disabled={updating}
                                    className="w-full h-12 rounded-xl border-dashed border-2 border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all font-bold group"
                                >
                                    <Undo2 className="h-4 w-4 mr-2 group-hover:-rotate-45 transition-transform" />
                                    Revert to Unpaid
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="space-y-5">
                                {!isCreditView ? (
                                    order.items && order.items.some((item: any) => item.status !== 'SERVED' && item.status !== 'CANCELLED') ? (
                                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-3">
                                            <div className="bg-orange-100 p-1.5 rounded-full text-orange-600 mt-0.5">
                                                <AlertCircle className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-orange-900">Cannot Settle Order</h4>
                                                <p className="text-[11px] text-orange-800 mt-1 leading-relaxed">
                                                    There are <strong>{order.items.filter((i: any) => i.status !== 'SERVED' && i.status !== 'CANCELLED').length} items</strong> not yet served or cancelled. All items must be processed before payment.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="space-y-4"
                                        >
                                            <div className="space-y-2.5">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Method</Label>
                                                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                                                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-white focus:ring-slate-900/5 shadow-sm transition-all text-sm font-bold">
                                                        <SelectValue placeholder="How was it paid?" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-slate-200 p-1 shadow-2xl">
                                                        {PAYMENT_METHODS.map((pm) => (
                                                            <SelectItem
                                                                key={pm.value}
                                                                value={pm.value}
                                                                className="rounded-xl focus:bg-slate-50 py-3"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("p-1.5 rounded-lg", pm.bgColor, pm.color)}>
                                                                        <pm.icon className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="font-bold text-slate-700">{pm.label}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="relative py-2">
                                                <div className="absolute inset-0 flex items-center">
                                                    <span className="w-full border-t border-slate-100" />
                                                </div>
                                                <div className="relative flex justify-center">
                                                    <span className="bg-white px-4 text-[10px] uppercase font-black tracking-widest text-slate-300">Alternate</span>
                                                </div>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setIsCreditView(true)}
                                                className="w-full h-12 rounded-2xl border border-orange-100 bg-orange-50/30 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-all font-bold gap-2"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                                Record as Customer Credit
                                            </Button>
                                        </motion.div>
                                    )
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-5 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                                                <AlertCircle className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-orange-900 italic">Credit Flow Enabled</p>
                                                <p className="text-[11px] text-orange-700 font-medium leading-relaxed opacity-80 mt-1">
                                                    Order will be marked as "Completed" but the payment will remain "Pending" in the customer's credit profile.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsCreditView(false)}
                                            className="w-full h-10 rounded-xl border-orange-200 text-orange-700 bg-white hover:bg-orange-50 font-bold"
                                        >
                                            <Undo2 className="h-3 w-3 mr-2" />
                                            Select Direct Payment
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-6 bg-slate-50 border-t border-slate-100 sm:justify-between items-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={updating}
                            className="text-slate-500 font-bold hover:bg-slate-200 rounded-xl px-6 h-12"
                        >
                            Dismiss
                        </Button>
                        {!isPaid && (
                            <Button
                                type="submit"
                                disabled={updating || (!method && !isCreditView)}
                                className={cn(
                                    "h-12 px-8 rounded-xl font-black transition-all shadow-lg flex-1 sm:flex-none",
                                    isCreditView
                                        ? "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200"
                                        : "bg-slate-900 hover:bg-black text-white shadow-slate-200"
                                )}
                            >
                                {updating ? (
                                    <Sparkles className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                )}
                                {updating ? 'Syncing...' : isCreditView ? 'Confirm Credit' : 'Finalize Payment'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog >
    );
}
