import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    MapPin,
    Check,
    X,
    Plus,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { useNavigate } from "react-router-dom";

interface HeadOrderDetailsModalProps {
    order: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMarkPaid: () => void;
    onAddItems?: (orderId: string, tableId?: string) => void;
}

// Status configuration with unique card accent colors
const STATUS_CONFIG: Record<string, {
    label: string; color: string; bgColor: string;
    dotColor: string; cardBg: string;
}> = {
    ACTIVE: {
        label: "Active", color: "text-emerald-600", bgColor: "bg-emerald-50",
        dotColor: "bg-emerald-500", cardBg: "bg-white",
    },
    COMPLETED: {
        label: "Completed", color: "text-blue-600", bgColor: "bg-blue-50",
        dotColor: "bg-blue-500", cardBg: "bg-slate-50/50",
    },
    CANCELLED: {
        label: "Cancelled", color: "text-rose-600", bgColor: "bg-rose-50",
        dotColor: "bg-rose-400", cardBg: "bg-rose-50/20",
    },
};

function getOrderLocationLabel(order: any): string {
    if (!order.table_id) return 'Takeaway';
    return `Table ${order.table_number || order.table_id}`;
}

export function HeadOrderDetailsModal({
    order,
    open,
    onOpenChange,
    onMarkPaid,
    onAddItems,
}: HeadOrderDetailsModalProps) {
    const navigate = useNavigate();

    if (!order) return null;

    const mCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ACTIVE;
    const mPaid = order.payment_status === 'PAID';

    const handleAddItems = () => {
        if (order.payment_status === 'PAID') {
            toast.error('Cannot add items to a paid order');
            return;
        }
        if (onAddItems) {
            onAddItems(order.id, order.table_id);
        } else {
            navigate(`/head/menu/${order.id}?table=${order.table_id || 'TAKEAWAY'}`);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm overflow-hidden rounded-2xl p-0 gap-0 border-0 shadow-2xl mx-auto flex flex-col">
                {/* Status strip */}
                <div className={`h-1 w-full shrink-0 ${mCfg.dotColor}`} />

                {/* Header */}
                <DialogHeader className={`px-4 pt-3 pb-2.5 border-b border-slate-100 ${mCfg.cardBg} shrink-0`}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-base font-extrabold text-slate-900 truncate leading-tight">
                                {order.customer_name || 'Guest'}
                            </DialogTitle>
                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5">
                                <span className="text-[10px] text-slate-400">#{order.order_number}</span>
                                <span className="text-slate-300">·</span>
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                                    <MapPin className="h-2.5 w-2.5" />{getOrderLocationLabel(order)}
                                </span>
                                {mPaid && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded px-1 py-0.5">
                                        <Check className="h-2 w-2" /> Paid
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${mCfg.bgColor} ${mCfg.color}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${mCfg.dotColor} animate-pulse`} />
                                {mCfg.label}
                            </span>
                            <button
                                className="h-6 w-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-3 w-3 text-slate-500" />
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Body — item chips */}
                <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pt-3 pb-1 bg-slate-50/50">
                    <div className="flex flex-wrap gap-1.5">
                        {order.items?.slice().sort((a: any, b: any) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        ).map((item: any, idx: number) => (
                            <div
                                key={item.id || idx}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold ${mCfg.bgColor} ${mCfg.color}`}
                            >
                                <span className="font-extrabold">{item.quantity}×</span>
                                <span className="truncate max-w-[100px]">
                                    {item.name_snapshot || item.product?.name || 'Item'}
                                </span>
                                <span className="font-extrabold opacity-75 tabular-nums">
                                    {formatINR(item.quantity * (item.price_snapshot || item.unit_price || 0))}
                                </span>
                            </div>
                        ))}
                    </div>
                    {/* Total */}
                    <div className="flex items-center justify-between mt-3 mb-2 px-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total</span>
                        <span className={`text-lg font-extrabold tabular-nums ${mCfg.color}`}>
                            {formatINR(order.total_amount)}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-3 py-2.5 bg-white border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <button
                            className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-xl text-[11px] font-extrabold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all duration-150 uppercase"
                            onClick={handleAddItems}
                        >
                            <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                        {order.payment_status !== 'PAID' && order.status !== 'CANCELLED' && (
                            <button
                                className="flex-[1.5] inline-flex items-center justify-center gap-1 h-9 rounded-xl text-[11px] font-extrabold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-150 uppercase shadow-sm"
                                onClick={onMarkPaid}
                            >
                                <Check className="h-3.5 w-3.5" /> Mark Paid
                            </button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
