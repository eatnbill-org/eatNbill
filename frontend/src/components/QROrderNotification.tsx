import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, QrCode, Printer, Check, User, MapPin, ShoppingBag } from 'lucide-react';
import { Order } from '@/types/order';
import { formatINR } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QROrderNotificationProps {
    order: Order | null;
    onDismiss: () => void;
    onViewDetails: (order: Order) => void;
    onReject?: (order: Order) => Promise<void> | void;
    autoAcceptSeconds?: number;
    playSound?: boolean;
}

import { printKitchenSlip } from '@/lib/print-utils';

const QROrderNotification: React.FC<QROrderNotificationProps> = ({
    order,
    onDismiss,
    onViewDetails,
    onReject,
    autoAcceptSeconds = 5,
    playSound = true,
}) => {
    const [countdown, setCountdown] = useState(autoAcceptSeconds);
    const [isAccepted, setIsAccepted] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset state when new order arrives
    useEffect(() => {
        if (!order) return;
        setCountdown(autoAcceptSeconds);
        setIsAccepted(false);

        if (!playSound) return;

        // Play notification sound
        const playNotificationSound = () => {
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(err => console.log('Audio play failed:', err));
        };
        playNotificationSound();
    }, [order, autoAcceptSeconds, playSound]);

    // Countdown timer with auto-accept
    useEffect(() => {
        if (!order || isAccepted) return;

        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Auto-accept at 0
                    handleAccept();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [order, isAccepted]);

    const handleAccept = () => {
        if (!order || isAccepted) return;
        setIsAccepted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Print kitchen slip
        printKitchenSlip(order);

        toast.success(`Order #${order.order_number || order.id.slice(-4).toUpperCase()} accepted & sent to kitchen!`, {
            duration: 3000,
        });

        // Auto-dismiss after brief success display
        setTimeout(() => onDismiss(), 2000);
    };

    const handleReject = async () => {
        if (!order || isAccepted || isRejecting) return;
        try {
            setIsRejecting(true);
            if (onReject) {
                await onReject(order);
            }
            onDismiss();
        } catch (error) {
            console.error('Failed to reject QR order:', error);
            toast.error('Failed to reject order');
        } finally {
            setIsRejecting(false);
        }
    };

    if (!order) return null;

    const progressPercent = (countdown / autoAcceptSeconds) * 100;
    const itemCount = order.items?.length || 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100, transition: { duration: 0.2 } }}
                className="fixed bottom-0 left-0 right-0 md:top-6 md:right-6 md:left-auto md:bottom-auto z-[9999] md:w-full md:max-w-sm p-3 md:p-0"
            >
                <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden ring-1 ring-emerald-500/10">
                    {/* Auto-accept progress bar */}
                    {!isAccepted && (
                        <div className="h-1.5 bg-slate-100 w-full">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                style={{ width: `${progressPercent}%` }}
                                transition={{ ease: "linear" }}
                            />
                        </div>
                    )}

                    {/* Header with gradient */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-white">
                            <QrCode className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">New QR Order</span>
                            {!isAccepted && (
                                <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse ml-1">
                                    Auto-accept in {countdown}s
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onDismiss}
                            className="text-white/80 hover:text-white transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="p-4">
                        {/* Order Number & Customer */}
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="text-2xl font-black text-slate-900 leading-none mb-1">
                                    #{order.order_number || order.id.slice(-4).toUpperCase()}
                                </h4>
                                <div className="flex items-center gap-3 mt-1.5 text-sm">
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <User className="h-3.5 w-3.5" />
                                        <span className="font-medium">{order.customer_name || 'Walk-in'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-500">
                                        <MapPin className="h-3.5 w-3.5" />
                                        <span className="font-medium">{order.table_number ? `Table ${order.table_number}` : 'Takeaway'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items preview */}
                        {order.items && order.items.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        {itemCount} item{itemCount > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-1 max-h-20 overflow-y-auto">
                                    {order.items.slice(0, 4).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-slate-700 font-medium truncate">
                                                {item.quantity}x {item.name_snapshot || item.name || 'Item'}
                                            </span>
                                        </div>
                                    ))}
                                    {itemCount > 4 && (
                                        <p className="text-xs text-slate-400 font-medium">+{itemCount - 4} more...</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Total & Actions */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-slate-900 font-black text-lg tabular-nums">
                                {formatINR(order.total_amount)}
                            </div>

                            {isAccepted ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                    <Check className="h-4 w-4" />
                                    Sent to Kitchen
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleReject}
                                        variant="outline"
                                        className="rounded-xl h-10 px-3 font-bold text-sm border-slate-200"
                                        disabled={isRejecting}
                                    >
                                        {isRejecting ? "Rejecting..." : "Reject"}
                                    </Button>
                                    <Button
                                        onClick={handleAccept}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        Accept & Print
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default QROrderNotification;
