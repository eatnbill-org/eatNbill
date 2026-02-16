import { create } from 'zustand';
import { Order } from '@/types/order';

interface NotificationState {
    // Queue of QR orders that need notifications
    queue: Order[];
    // Current active notification
    current: Order | null;
    // History to avoid duplicate notifications for the same order in one session
    shownIds: Set<string>;

    // Actions
    addNotification: (order: Order) => void;
    dismissNotification: () => void;
    clearQueue: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    queue: [],
    current: null,
    shownIds: new Set<string>(),

    addNotification: (order: Order) => {
        const { shownIds, current, queue } = get();

        // Only notify for QR orders and avoid duplicates
        if (order.source !== 'QR' || shownIds.has(order.id)) {
            return;
        }

        const newShownIds = new Set(shownIds).add(order.id);

        if (!current) {
            set({
                current: order,
                shownIds: newShownIds
            });
        } else {
            set({
                queue: [...queue, order],
                shownIds: newShownIds
            });
        }
    },

    dismissNotification: () => {
        const { queue } = get();

        if (queue.length > 0) {
            const [next, ...remaining] = queue;
            set({ current: next, queue: remaining });
        } else {
            set({ current: null });
        }
    },

    clearQueue: () => {
        set({ queue: [], current: null });
    },
}));
