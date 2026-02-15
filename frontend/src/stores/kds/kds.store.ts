/**
 * KDS Store (Kitchen Display System)
 * Phase 4: Orders & Order Lifecycle
 *
 * Kitchen-facing order management for staff.
 * Shows only active orders with auto-clear settings.
 *
 * Key responsibilities:
 * - Subscribe to active orders only (PLACED, CONFIRMED, PREPARING, READY)
 * - Get KDS dashboard data
 * - Update KDS settings (sound, auto-clear timer)
 * - Auto-clear completed orders based on settings
 * - Optimized for low-latency kitchen view
 *
 * Architecture:
 * - Uses apiClient for HTTP requests
 * - Uses realtimeStore for restaurant-wide subscriptions
 * - Filters to active orders only
 * - Independent of admin orders store
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { useRealtimeStore } from '../realtime/realtime.store';
import type {
  ApiError,
  Order,
  KdsDashboard,
  KdsSettings,
  KdsDashboardResponse,
  UpdateKdsSettingsPayload,
} from '@/types/order';

// ============================================================
// STORE STATE
// ============================================================

interface KdsState {
  // Data
  activeOrders: Order[];
  dashboard: KdsDashboard | null;
  settings: KdsSettings | null;
  
  // UI State
  loading: boolean;
  updating: boolean;
  error: ApiError | null;
  
  // Realtime
  realtimeConnected: boolean;
  unsubscribeRealtime: (() => void) | null;
  
  // Auto-clear timers
  clearTimers: Map<string, NodeJS.Timeout>;
  
  // Computed helpers
  ordersByStatus: (status: string) => Order[];
  placedOrders: () => Order[];
  confirmedOrders: () => Order[];
  preparingOrders: () => Order[];
  readyOrders: () => Order[];
  
  // Actions
  fetchDashboard: () => Promise<void>;
  updateSettings: (data: UpdateKdsSettingsPayload) => Promise<boolean>;
  
  // Realtime
  subscribeToOrders: (restaurantId: string) => void;
  unsubscribe: () => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
  
  // Private helpers (internal use only)
  _setupAutoClearTimer: (order: Order) => void;
  _clearAutoClearTimer: (orderId: string) => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  activeOrders: [],
  dashboard: null,
  settings: null,
  loading: false,
  updating: false,
  error: null,
  realtimeConnected: false,
  unsubscribeRealtime: null,
  clearTimers: new Map(),
};

// ============================================================
// HELPER: IS ACTIVE STATUS
// ============================================================

const isActiveStatus = (status: string): boolean => {
  return ['PLACED', 'CONFIRMED', 'PREPARING', 'READY'].includes(status);
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useKdsStore = create<KdsState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // COMPUTED HELPERS
  // ----------------------------------------------------------

  ordersByStatus: (status: string) => {
    return get().activeOrders.filter((o) => o.status === status);
  },

  placedOrders: () => get().ordersByStatus('PLACED'),
  confirmedOrders: () => get().ordersByStatus('CONFIRMED'),
  preparingOrders: () => get().ordersByStatus('PREPARING'),
  readyOrders: () => get().ordersByStatus('READY'),

  // ----------------------------------------------------------
  // FETCH KDS DASHBOARD
  // ----------------------------------------------------------

  fetchDashboard: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<KdsDashboardResponse>('/kds/dashboard');

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      const dashboard = response.data?.data;
      if (dashboard) {
        set({
          dashboard,
          activeOrders: dashboard.orders,
          settings: dashboard.settings,
          loading: false,
          error: null,
        });

        // Set up auto-clear timers for READY orders if enabled
        if (dashboard.settings.auto_clear_completed_after_seconds) {
          const readyOrders = dashboard.orders.filter((o) => o.status === 'READY');
          readyOrders.forEach((order) => {
            get()._setupAutoClearTimer(order);
          });
        }
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard',
        },
        loading: false,
      });
    }
  },

  // ----------------------------------------------------------
  // UPDATE KDS SETTINGS
  // ----------------------------------------------------------

  updateSettings: async (data: UpdateKdsSettingsPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<{ success: boolean }>(
        '/kds/settings',
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return false;
      }

      // Update local settings
      set((state) => ({
        settings: state.settings ? { ...state.settings, ...data } : null,
        updating: false,
        error: null,
      }));

      // If auto-clear timer changed, update timers
      if (data.auto_clear_completed_after_seconds !== undefined) {
        const { clearTimers, activeOrders } = get();
        
        // Clear all existing timers
        clearTimers.forEach((timer) => clearTimeout(timer));
        set({ clearTimers: new Map() });

        // Set up new timers if enabled
        if (data.auto_clear_completed_after_seconds > 0) {
          const readyOrders = activeOrders.filter((o) => o.status === 'READY');
          readyOrders.forEach((order) => {
            get()._setupAutoClearTimer(order);
          });
        }
      }

      return true;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update settings',
        },
        updating: false,
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
          // New order created - add if active
          if (isActiveStatus(order.status)) {
            set((state) => ({
              activeOrders: [...state.activeOrders, order],
            }));

            // Set up auto-clear timer if READY
            if (order.status === 'READY') {
              get()._setupAutoClearTimer(order);
            }
          }
        } else if (eventType === 'UPDATE') {
          const wasActive = update.oldOrder && isActiveStatus(update.oldOrder.status);
          const isActive = isActiveStatus(order.status);

          if (wasActive && isActive) {
            // Still active - update
            set((state) => ({
              activeOrders: state.activeOrders.map((o) => (o.id === order.id ? order : o)),
            }));

            // Set up auto-clear timer if transitioned to READY
            if (update.oldOrder?.status !== 'READY' && order.status === 'READY') {
              get()._setupAutoClearTimer(order);
            }
          } else if (wasActive && !isActive) {
            // Became inactive (COMPLETED or CANCELLED) - remove
            set((state) => ({
              activeOrders: state.activeOrders.filter((o) => o.id !== order.id),
            }));

            // Clear auto-clear timer if exists
            get()._clearAutoClearTimer(order.id);
          } else if (!wasActive && isActive) {
            // Became active (shouldn't happen, but handle it)
            set((state) => ({
              activeOrders: [...state.activeOrders, order],
            }));
          }
        } else if (eventType === 'DELETE') {
          // Order deleted - remove
          set((state) => ({
            activeOrders: state.activeOrders.filter((o) => o.id !== order.id),
          }));

          // Clear auto-clear timer if exists
          get()._clearAutoClearTimer(order.id);
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
    const { unsubscribeRealtime, clearTimers } = get();

    if (unsubscribeRealtime) {
      unsubscribeRealtime();
      set({
        unsubscribeRealtime: null,
        realtimeConnected: false,
      });
    }

    // Clear all auto-clear timers
    clearTimers.forEach((timer) => clearTimeout(timer));
    set({ clearTimers: new Map() });
  },

  // ----------------------------------------------------------
  // PRIVATE: SET UP AUTO-CLEAR TIMER
  // ----------------------------------------------------------

  _setupAutoClearTimer: (order: Order) => {
    const { settings, clearTimers } = get();

    if (!settings?.auto_clear_completed_after_seconds) {
      return;
    }

    // Don't set timer if order is not READY
    if (order.status !== 'READY') {
      return;
    }

    // Clear existing timer if any
    const existingTimer = clearTimers.get(order.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      // Remove order from active orders
      set((state) => ({
        activeOrders: state.activeOrders.filter((o) => o.id !== order.id),
      }));

      // Remove timer from map
      get()._clearAutoClearTimer(order.id);
    }, settings.auto_clear_completed_after_seconds * 1000);

    set((state) => ({
      clearTimers: new Map(state.clearTimers).set(order.id, timer),
    }));
  },

  // ----------------------------------------------------------
  // PRIVATE: CLEAR AUTO-CLEAR TIMER
  // ----------------------------------------------------------

  _clearAutoClearTimer: (orderId: string) => {
    const { clearTimers } = get();
    const timer = clearTimers.get(orderId);

    if (timer) {
      clearTimeout(timer);
      const newTimers = new Map(clearTimers);
      newTimers.delete(orderId);
      set({ clearTimers: newTimers });
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
