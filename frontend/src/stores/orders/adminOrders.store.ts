/**
 * Admin Orders Store
 * Phase 4: Orders & Order Lifecycle
 *
 * Full CRUD operations for restaurant staff (ADMIN/MANAGER/WAITER).
 * Manages all orders for the restaurant with realtime updates.
 *
 * Key responsibilities:
 * - List orders with filters (status, date range, pagination)
 * - Create staff-placed orders
 * - Update order status (state machine validation)
 * - Update payment information
 * - Manage order items (add/update/remove)
 * - Subscribe to realtime updates for ALL restaurant orders
 * - Get order statistics and revenue summaries
 *
 * Architecture:
 * - Uses apiClient for HTTP requests
 * - Uses realtimeStore for subscriptions
 * - Optimistic updates with rollback on error
 * - State machine validation before API calls
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { useRealtimeStore } from '../realtime/realtime.store';
import { useNotificationStore } from '../notifications.store';
import type {
  ApiError,
  Order,
  OrderListResponse,
  OrderResponse,
  OrderStatsResponse,
  RevenueSummaryResponse,
  CreateOrderPayload,
  UpdateOrderStatusPayload,
  UpdatePaymentPayload,
  AddOrderItemsPayload,
  UpdateOrderItemPayload,
  OrderFilters,
  OrderStats,
  RevenueSummary,
  isValidTransition,
} from '@/types/order';
import { isValidTransition as validateTransition } from '@/types/order';

// ============================================================
// STORE STATE
// ============================================================

interface AdminOrdersState {
  // Data
  orders: Order[];
  stats: OrderStats | null;
  revenue: RevenueSummary | null;
  udhaarList: any[];

  // UI State
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: ApiError | null;

  // Filter state
  filters: OrderFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;

  // Realtime
  realtimeConnected: boolean;
  unsubscribeRealtime: (() => void) | null;

  // Computed helpers
  getOrderById: (id: string) => Order | undefined;
  getOrdersByStatus: (status: string) => Order[];
  activeOrders: () => Order[];

  // Actions
  fetchOrders: (filters?: OrderFilters) => Promise<void>;
  fetchOrder: (id: string) => Promise<Order | null>;
  fetchStats: () => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchUdhaarList: () => Promise<void>;
  settleCredit: (data: any) => Promise<boolean>;
  createOrder: (data: CreateOrderPayload) => Promise<Order | null>;
  updateOrderStatus: (id: string, data: UpdateOrderStatusPayload) => Promise<Order | null>;
  updatePayment: (id: string, data: UpdatePaymentPayload) => Promise<Order | null>;
  updateOrderItem: (orderId: string, itemId: string, data: UpdateOrderItemPayload) => Promise<Order | null>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<boolean>;
  deleteOrder: (id: string) => Promise<boolean>;

  // Realtime
  subscribeToOrders: (restaurantId: string) => void;
  unsubscribe: () => void;

  // Utility
  setFilters: (filters: OrderFilters) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  orders: [],
  stats: null,
  revenue: null,
  udhaarList: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
  filters: {},
  pagination: null,
  realtimeConnected: false,
  unsubscribeRealtime: null,
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useAdminOrdersStore = create<AdminOrdersState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // COMPUTED HELPERS
  // ----------------------------------------------------------

  getOrderById: (id: string) => {
    return get().orders.find((o) => o.id === id);
  },

  getOrdersByStatus: (status: string) => {
    return get().orders.filter((o) => o.status === status);
  },

  activeOrders: () => {
    return get().orders.filter((o) => o.status === 'ACTIVE');
  },

  // ----------------------------------------------------------
  // FETCH ORDERS
  // ----------------------------------------------------------

  fetchOrders: async (filters?: OrderFilters) => {
    set({ loading: true, error: null });

    if (filters) {
      set({ filters });
    }

    const currentFilters = filters || get().filters;
    const params = new URLSearchParams();

    if (currentFilters.status) params.append('status', currentFilters.status);
    if (currentFilters.source) params.append('source', currentFilters.source);
    if (currentFilters.from_date) params.append('from_date', currentFilters.from_date);
    if (currentFilters.to_date) params.append('to_date', currentFilters.to_date);
    if (currentFilters.page) params.append('page', currentFilters.page.toString());
    if (currentFilters.limit) params.append('limit', currentFilters.limit.toString());

    try {
      const response = await apiClient.get<OrderListResponse>(
        `/orders?${params.toString()}`
      );

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      set({
        orders: response.data?.data || [],
        pagination: response.data?.pagination || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch orders',
        },
        loading: false,
      });
    }
  },

  // ----------------------------------------------------------
  // FETCH SINGLE ORDER
  // ----------------------------------------------------------

  fetchOrder: async (id: string) => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<OrderResponse>(`/orders/${id}`);

      if (response.error) {
        set({ error: response.error, loading: false });
        return null;
      }

      const order = response.data?.data;
      if (order) {
        // Update or add to orders list
        set((state) => ({
          orders: state.orders.some((o) => o.id === id)
            ? state.orders.map((o) => (o.id === id ? order : o))
            : [...state.orders, order],
          loading: false,
          error: null,
        }));
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
  // FETCH STATS
  // ----------------------------------------------------------

  fetchStats: async () => {
    try {
      const response = await apiClient.get<OrderStatsResponse>('/orders/stats');

      if (response.error) {
        return;
      }

      set({ stats: response.data?.data || null });
    } catch (error) {
      // Silent fail - stats are non-critical
    }
  },

  // ----------------------------------------------------------
  // FETCH REVENUE
  // ----------------------------------------------------------

  fetchRevenue: async () => {
    try {
      const response = await apiClient.get<RevenueSummaryResponse>('/orders/revenue');

      if (response.error) {
        return;
      }

      set({ revenue: response.data?.data || null });
    } catch (error) {
      // Silent fail - revenue is non-critical
    }
  },

  // ----------------------------------------------------------
  // FETCH UDHAAR LIST
  // ----------------------------------------------------------

  fetchUdhaarList: async () => {
    try {
      const response = await apiClient.get<any>('/orders/analytics/udhaar');

      if (response.error) {
        return;
      }

      set({ udhaarList: response.data?.data || [] });
    } catch (error) {
      // Silent fail
    }
  },

  // ----------------------------------------------------------
  // SETTLE CREDIT
  // ----------------------------------------------------------

  settleCredit: async (data: any) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.post<any>('/orders/analytics/settle', data);

      if (response.error) {
        set({ error: response.error, updating: false });
        return false;
      }

      // Refresh data
      await Promise.all([
        get().fetchRevenue(),
        get().fetchUdhaarList(),
      ]);

      set({ updating: false, error: null });
      return true;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to settle credit',
        },
        updating: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // CREATE ORDER (STAFF-PLACED)
  // ----------------------------------------------------------

  createOrder: async (data: CreateOrderPayload) => {
    set({ creating: true, error: null });

    try {
      const response = await apiClient.post<OrderResponse>('/orders', data);

      if (response.error) {
        set({ error: response.error, creating: false });
        return null;
      }

      const newOrder = response.data?.data;
      if (newOrder) {
        set((state) => ({
          orders: [newOrder, ...state.orders],
          creating: false,
          error: null,
        }));

        // Refresh stats
        get().fetchStats();

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
  // UPDATE ORDER STATUS
  // ----------------------------------------------------------

  updateOrderStatus: async (id: string, data: UpdateOrderStatusPayload) => {
    const order = get().getOrderById(id);
    if (!order) {
      set({
        error: { code: 'NOT_FOUND', message: 'Order not found' }
      });
      return null;
    }

    // Validate state transition
    if (!validateTransition(order.status, data.status)) {
      set({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from ${order.status} to ${data.status}`,
        },
      });
      return null;
    }

    // Require cancel_reason for cancellation
    if (data.status === 'CANCELLED' && !data.cancel_reason) {
      set({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cancel reason is required',
        },
      });
      return null;
    }

    set({ updating: true, error: null });

    // Optimistic update
    const previousOrders = get().orders;
    const optimisticOrder = { ...order, status: data.status };
    set((state) => ({
      orders: state.orders.map((o) => (o.id === id ? optimisticOrder : o)),
    }));

    try {
      const response = await apiClient.patch<OrderResponse>(
        `/orders/${id}/status`,
        data
      );

      if (response.error) {
        // Rollback
        set({ orders: previousOrders, error: response.error, updating: false });
        return null;
      }

      const updatedOrder = response.data?.data;
      if (updatedOrder) {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
          updating: false,
          error: null,
        }));

        // Refresh data
        await Promise.all([
          get().fetchStats(),
          get().fetchRevenue(),
          get().fetchUdhaarList(),
        ]);

        return updatedOrder;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      // Rollback
      set({
        orders: previousOrders,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update order status',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // UPDATE PAYMENT
  // ----------------------------------------------------------

  updatePayment: async (id: string, data: UpdatePaymentPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<OrderResponse>(
        `/orders/${id}/payment`,
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return null;
      }

      const updatedOrder = response.data?.data;
      if (updatedOrder) {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
          updating: false,
          error: null,
        }));
        return updatedOrder;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update payment',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // ADD ORDER ITEMS
  // ----------------------------------------------------------

  addOrderItems: async (id: string, data: AddOrderItemsPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.post<OrderResponse>(
        `/orders/${id}/items`,
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return null;
      }

      const updatedOrder = response.data?.data;
      if (updatedOrder) {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
          updating: false,
          error: null,
        }));
        return updatedOrder;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to add items',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // UPDATE ORDER ITEM
  // ----------------------------------------------------------

  updateOrderItem: async (orderId: string, itemId: string, data: UpdateOrderItemPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<OrderResponse>(
        `/orders/${orderId}/items/${itemId}`,
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return null;
      }

      const updatedOrder = response.data?.data;
      if (updatedOrder) {
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updatedOrder : o)),
          updating: false,
          error: null,
        }));
        return updatedOrder;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update item',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // REMOVE ORDER ITEM
  // ----------------------------------------------------------

  removeOrderItem: async (orderId: string, itemId: string) => {
    set({ deleting: true, error: null });

    try {
      const response = await apiClient.delete(`/orders/${orderId}/items/${itemId}`);

      if (response.error) {
        set({ error: response.error, deleting: false });
        return false;
      }

      // Fetch updated order
      await get().fetchOrder(orderId);

      set({ deleting: false, error: null });
      return true;
    } catch (error) {
      set({
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to remove item',
        },
        deleting: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // DELETE ORDER
  // ----------------------------------------------------------

  deleteOrder: async (id: string) => {
    set({ deleting: true, error: null });

    try {
      const response = await apiClient.delete(`/orders/${id}`);

      if (response.error) {
        set({ error: response.error, deleting: false });
        return false;
      }

      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id),
        deleting: false,
        error: null,
      }));

      // Refresh stats
      get().fetchStats();

      return true;
    } catch (error) {
      set({
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete order',
        },
        deleting: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // SUBSCRIBE TO REALTIME UPDATES
  // ----------------------------------------------------------

  subscribeToOrders: (restaurantId: string) => {
    const { unsubscribeRealtime } = get();

    // Unsubscribe from previous subscription if any
    if (unsubscribeRealtime) {
      unsubscribeRealtime();
    }

    // Subscribe to restaurant orders
    const unsubscribe = useRealtimeStore.getState().subscribeToRestaurantOrders(
      restaurantId,
      (update) => {
        const { eventType, order } = update;

        if (eventType === 'INSERT') {
          // New order created
          set((state) => ({
            orders: [order, ...state.orders],
          }));

          // Trigger notification if it's a QR order
          if (order.source === 'QR') {
            useNotificationStore.getState().addNotification(order);
          }

          // Refresh stats
          get().fetchStats();
        } else if (eventType === 'UPDATE') {
          // Order updated
          set((state) => ({
            orders: state.orders.map((o) => (o.id === order.id ? order : o)),
          }));

          // Refresh stats if status changed
          if (update.oldOrder?.status !== order.status) {
            get().fetchStats();
          }
        } else if (eventType === 'DELETE') {
          // Order deleted (shouldn't happen, but handle it)
          set((state) => ({
            orders: state.orders.filter((o) => o.id !== order.id),
          }));
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

  setFilters: (filters: OrderFilters) => {
    set({ filters });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    const { unsubscribe } = get();
    unsubscribe();
    set(initialState);
  },
}));
