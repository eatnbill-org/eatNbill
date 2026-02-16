/**
 * QR Order Notification Popup
 * 
 * Shows a real-time notification when a new QR/customer order is placed.
 * Includes auto-accept countdown (5 seconds) and order details.
 * Automatically prints kitchen slip on accept.
 */
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Clock, User, MapPin, ShoppingBag, X, Printer, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';

interface QROrderNotification {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone?: string;
    table_number?: string;
    table_id?: string;
    total_amount: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    created_at: string;
    source?: string;
}

interface QROrderNotificationPopupProps {
    notification: QROrderNotification | null;
    onAccept: (orderId: string) => void;
    onDismiss: () => void;
    autoAcceptSeconds?: number;
}

export default function QROrderNotificationPopup({
    notification,
    onAccept,
    onDismiss,
    autoAcceptSeconds = 5,
}: QROrderNotificationPopupProps) {
    const [countdown, setCountdown] = React.useState(autoAcceptSeconds);
    const [isAccepted, setIsAccepted] = React.useState(false);
    const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset countdown when new notification arrives
    React.useEffect(() => {
        if (notification) {
            setCountdown(autoAcceptSeconds);
            setIsAccepted(false);
        }
    }, [notification, autoAcceptSeconds]);

    // Countdown timer
    React.useEffect(() => {
        if (!notification || isAccepted) return;

        intervalRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Auto-accept
                    handleAccept();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [notification, isAccepted]);

    const handleAccept = () => {
        if (!notification || isAccepted) return;
        setIsAccepted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Print kitchen slip
        printOrderSlip(notification);

        onAccept(notification.id);
        toast.success(`Order #${notification.order_number} accepted & sent to kitchen!`);

        // Dismiss after a brief moment
        setTimeout(() => onDismiss(), 1500);
    };

    const handleDismiss = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onDismiss();
    };

    // Print kitchen slip for QR order
    const printOrderSlip = (order: QROrderNotification) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        const itemsHtml = order.items.map(item =>
            `<tr><td style="padding:4px 0;font-size:14px;">${item.quantity}x ${item.name}</td></tr>`
        ).join('');

        const slipHtml = `<!DOCTYPE html><html><head><title>Kitchen Order</title>
        <style>
            @page { margin: 5mm; size: 80mm auto; }
            body { font-family: 'Courier New', monospace; margin: 0; padding: 8px; font-size: 14px; width: 76mm; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .header h1 { font-size: 18px; margin: 0; letter-spacing: 2px; }
            .qr-badge { text-align: center; background: #000; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-bottom: 6px; }
            .info { margin-bottom: 8px; }
            .info p { margin: 2px 0; font-size: 13px; }
            .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; }
            .items table { width: 100%; }
            .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #666; }
        </style></head><body>
            <div class="header">
                <div class="qr-badge">QR ORDER</div>
                <h1>KITCHEN ORDER</h1>
            </div>
            <div class="info">
                <p><strong>Order:</strong> #${order.order_number}</p>
                <p><strong>Table:</strong> ${order.table_number || 'Takeaway'}</p>
                <p><strong>Time:</strong> ${timeStr}</p>
                <p><strong>Date:</strong> ${dateStr}</p>
                ${order.customer_name ? `<p><strong>Customer:</strong> ${order.customer_name}</p>` : ''}
            </div>
            <div class="items"><table>${itemsHtml}</table></div>
            <div class="footer"><p>--- Kitchen Copy (QR Order) ---</p></div>
        </body></html>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:80mm;height:0;';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(slipHtml);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 3000);
            }, 300);
        }
    };

    if (!notification) return null;

    const progressPercent = (countdown / autoAcceptSeconds) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed top-4 right-4 z-[9999] w-[380px] max-w-[calc(100vw-2rem)]"
            >
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    {/* Auto-accept progress bar */}
                    {!isAccepted && (
                        <div className="h-1 bg-slate-100">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                initial={{ width: '100%' }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1, ease: 'linear' }}
                            />
                        </div>
                    )}

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white relative">
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={handleDismiss}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm">
                                <QrCode className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-lg tracking-tight">New QR Order!</h3>
                                    {!isAccepted && (
                                        <span className="bg-white/25 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                                            {countdown}s
                                        </span>
                                    )}
                                </div>
                                <p className="text-emerald-100 text-xs font-medium">
                                    Order #{notification.order_number}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                        {/* Customer & Table info */}
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <User className="h-3.5 w-3.5" />
                                <span className="font-semibold">{notification.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="font-semibold">
                                    {notification.table_number ? `Table ${notification.table_number}` : 'Takeaway'}
                                </span>
                            </div>
                        </div>

                        {/* Items preview */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center gap-1.5 mb-2">
                                <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {notification.items.length} item{notification.items.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                {notification.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-700 font-medium truncate">
                                            {item.quantity}x {item.name}
                                        </span>
                                        <span className="text-slate-500 font-semibold shrink-0 ml-2">
                                            {formatINR(item.quantity * item.price)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-600">Total</span>
                            <span className="text-xl font-black text-emerald-600 tracking-tight">
                                {formatINR(notification.total_amount)}
                            </span>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-4 pb-4 flex gap-2">
                        {isAccepted ? (
                            <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
                                <Check className="h-5 w-5" />
                                Accepted & Sent to Kitchen
                            </div>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleDismiss}
                                    className="flex-1 rounded-xl h-11 border-slate-200 text-slate-600 font-bold"
                                >
                                    Skip
                                </Button>
                                <Button
                                    onClick={handleAccept}
                                    className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Accept & Print
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
