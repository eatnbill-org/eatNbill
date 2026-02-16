import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface QROrderPayload {
  order_id: string;
  order_number: string;
  table_number: string;
  customer_name: string;
  total_amount: number;
  items_count: number;
  timestamp: string;
}

interface QROrderNotificationProps {
  order: QROrderPayload;
  onAccept: (orderId: string, isAutoAccept?: boolean) => void;
  onReject: (orderId: string) => void;
  onDismiss: () => void;
  autoAcceptSeconds?: number;
}

export function QROrderNotification({
  order,
  onAccept,
  onReject,
  onDismiss,
  autoAcceptSeconds = 5,
}: QROrderNotificationProps) {
  const [timeLeft, setTimeLeft] = useState(autoAcceptSeconds);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play notification sound on mount
    try {
      audioRef.current = new Audio('/sounds/notification.mp3');
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Ignore if audio fails to play (browser restrictions)
      });
    } catch (error) {
      // Ignore audio errors
    }

    // Start countdown timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!isProcessing) {
            setIsProcessing(true);
            onAccept(order.order_id, true); // Auto-accept with silent flag
            // Auto-dismiss after a short delay
            setTimeout(() => onDismiss(), 500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoAccept = () => {
    if (!isProcessing) {
      setIsProcessing(true);
      onAccept(order.order_id);
    }
  };

  const handleAcceptClick = () => {
    if (!isProcessing) {
      setIsProcessing(true);
      onAccept(order.order_id, false); // Manual accept
      // Auto-dismiss after action
      setTimeout(() => onDismiss(), 300);
    }
  };

  const handleRejectClick = () => {
    if (!isProcessing) {
      setIsProcessing(true);
      onReject(order.order_id);
      // Auto-dismiss after action
      setTimeout(() => onDismiss(), 300);
    }
  };

  const progressPercentage = (timeLeft / autoAcceptSeconds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'fixed top-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)]',
        'bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-orange-400',
        'overflow-hidden'
      )}
    >
      {/* Header with dismiss button */}
      <div className="flex items-center justify-between px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <h3 className="font-semibold text-orange-900 dark:text-orange-100 text-sm">
            New QR Order
          </h3>
        </div>
        <button
          onClick={onDismiss}
          disabled={isProcessing}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Order details */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Order #</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {order.order_number}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Table</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {order.table_number}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Customer</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {order.customer_name}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs">Items</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {order.items_count}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Amount</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              ₹{Number(order.total_amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Timer display */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Auto-accepting in
          </span>
          <span className="text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">
            {timeLeft}s
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-orange-500"
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAcceptClick}
            disabled={isProcessing}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-green-600 hover:bg-green-700 text-white font-medium text-sm',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <CheckCircle className="w-4 h-4" />
            Accept Now
          </button>
          <button
            onClick={handleRejectClick}
            disabled={isProcessing}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'bg-red-600 hover:bg-red-700 text-white font-medium text-sm',
              'transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface QROrderNotificationContainerProps {
  orders: QROrderPayload[];
  onAccept: (orderId: string, isAutoAccept?: boolean) => void;
  onReject: (orderId: string) => void;
}

export function QROrderNotificationContainer({
  orders,
  onAccept,
  onReject,
}: QROrderNotificationContainerProps) {
  const [dismissedOrders, setDismissedOrders] = useState<Set<string>>(new Set());

  const handleDismiss = (orderId: string) => {
    setDismissedOrders((prev) => new Set(prev).add(orderId));
  };

  const visibleOrders = orders.filter((order) => !dismissedOrders.has(order.order_id));

  return (
    <AnimatePresence mode="popLayout">
      {visibleOrders.map((order, index) => (
        <div
          key={order.order_id}
          style={{
            position: 'fixed',
            top: `${1 + index * 0.5}rem`,
            right: `${1 + index * 0.5}rem`,
            zIndex: 9999 - index,
          }}
        >
          <QROrderNotification
            order={order}
            onAccept={onAccept}
            onReject={onReject}
            onDismiss={() => handleDismiss(order.order_id)}
          />
        </div>
      ))}
    </AnimatePresence>
  );
}
