/**
 * Customer Orders Store
 * Phase 4: Orders & Order Lifecycle
 *
 * Customer-facing order operations (public endpoint).
 * Allows customers to create orders and track their status in realtime.
 *
 * Key responsibilities:
 * - Create public order (no authentication required)
 * - View single order status
 * - Subscribe to realtime updates for specific order
 * - Stop updates when order reaches terminal state
 *
 * Architecture:
 * - Uses apiClient for HTTP requests
 * - Uses realtimeStore for single-order subscriptions
 * - Read-only (no status updates or item modifications)
 * - Simpler than admin store
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { useRealtimeStore } from '../realtime/realtime.store';
import type {
  ApiError,
  Order,
  OrderResponse,
  CreatePublicOrderPayload,
} from '@/types/order';

// ============================================================
// STORE STATE
// ============================================================

interface CustomerOrdersState {
  // Data
  currentOrder: Order | null;
  
  // UI State
  loading: boolean;
  creating: boolean;
  error: ApiError | null;
  
  // Realtime
  realtimeConnected: boolean;
  unsubscribeRealtime: (() => void) | null;
  
  // Actions
  createOrder: (slug: string, data: CreatePublicOrderPayload) => Promise<Order | null>;
  fetchOrder: (orderId: string) => Promise<Order | null>;
  
  // Realtime
  subscribeToOrder: (orderId: string) => void;
  unsubscribe: () => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  currentOrder: null,
  loading: false,
  creating: false,
  error: null,
  realtimeConnected: false,
  unsubscribeRealtime: null,
};

// ============================================================
// HELPER: IS TERMINAL STATUS
// ============================================================

const isTerminalStatus = (status: string): boolean => {
  return ['COMPLETED', 'CANCELLED'].includes(status);
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useCustomerOrdersStore = create<CustomerOrdersState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // CREATE ORDER (PUBLIC)
  // ----------------------------------------------------------

  createOrder: async (slug: string, data: CreatePublicOrderPayload) => {
    set({ creating: true, error: null });

    try {
      const response = await apiClient.post<OrderResponse>(
        `/public/${slug}/order`,
        data
      );

      if (response.error) {
        set({ error: response.error, creating: false });
        return null;
      }

      const newOrder = response.data?.data;
      if (newOrder) {
        set({
          currentOrder: newOrder,
          creating: false,
          error: null,
        });

        // Auto-subscribe to realtime updates
        get().subscribeToOrder(newOrder.id);

        return newOrder;
      }

      set({ creating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create order',
        },
        creating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // FETCH ORDER
  // ----------------------------------------------------------

  fetchOrder: async (orderId: string) => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<OrderResponse>(`/public/order/${orderId}`);

      if (response.error) {
        set({ error: response.error, loading: false });
        return null;
      }

      const order = response.data?.data;
      if (order) {
        set({
          currentOrder: order,
          loading: false,
          error: null,
        });

        // Subscribe to realtime if not already subscribed
        if (!get().realtimeConnected) {
          get().subscribeToOrder(order.id);
        }

        return order;
      }

      set({ loading: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch order',
        },
        loading: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // SUBSCRIBE TO REALTIME UPDATES
  // ----------------------------------------------------------

  subscribeToOrder: (orderId: string) => {
    const { unsubscribeRealtime, currentOrder } = get();

    // Don't subscribe if order is already in terminal state
    if (currentOrder && isTerminalStatus(currentOrder.status)) {
      return;
    }

    // Unsubscribe from previous subscription if any
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }

    // Subscribe to specific order
    const unsubscribe = useRealtimeStore.getState().subscribeToOrder(
      orderId,
      (update) => {
        const { order } = update;

        set({ currentOrder: order });

        // Auto-unsubscribe if order reaches terminal state
        if (isTerminalStatus(order.status)) {
          get().unsubscribe();
        }
      }
    );

    set({
      unsubscribeRealtime: unsubscribe,
      realtimeConnected: true,
    });
  },

  // ----------------------------------------------------------
  // UNSUBSCRIBE FROM REALTIME
  // ----------------------------------------------------------

  unsubscribe: () => {
    const { unsubscribeRealtime } = get();

    if (unsubscribeRealtime) {
      unsubscribeRealtime();
      set({
        unsubscribeRealtime: null,
        realtimeConnected: false,
      });
    }
  },

  // ----------------------------------------------------------
  // UTILITY ACTIONS
  // ----------------------------------------------------------

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    const { unsubscribe } = get();
    unsubscribe();
    set(initialState);
  },
}));
