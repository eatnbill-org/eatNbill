/**
 * Realtime Store
 * Phase 4: Orders & Order Lifecycle
 *
 * Central hub for all Supabase Realtime connections.
 */

import { create } from 'zustand';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Order, RealtimeOrderUpdate, RealtimeEvent } from '@/types/order';

type OrderEventHandler = (update: RealtimeOrderUpdate) => void;

// QR Order notification handlers
export interface QROrderPayload {
  order_id: string;
  order_number: string;
  table_number: string;
  customer_name: string;
  total_amount: number;
  items_count: number;
  timestamp: string;
}

type QROrderEventHandler = (payload: QROrderPayload) => void;
type ConnectionMode = 'realtime' | 'polling';

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionMode: ConnectionMode;
  error: string | null;
  lastError: string | null;
  lastConnectedAt: number | null;
  disabled: boolean;

  activeChannels: Map<string, RealtimeChannel>;
  eventHandlers: Map<string, Set<OrderEventHandler>>;
  qrOrderHandlers: Map<string, Set<QROrderEventHandler>>;

  subscribeToRestaurantOrders: (restaurantId: string, handler: OrderEventHandler) => () => void;
  subscribeToOrder: (orderId: string, handler: OrderEventHandler) => () => void;
  subscribeToPendingOrders: (restaurantId: string, handler: QROrderEventHandler) => () => void;
  unsubscribeAll: () => void;
  reconnect: () => Promise<void>;

  _supabase: ReturnType<typeof createClient> | null;
  _retryAttempts: number;
  _retryTimeout: ReturnType<typeof setTimeout> | null;
  _initSupabase: () => void;
  _dispatchUpdate: (handlerKey: string, update: RealtimeOrderUpdate) => void;
  _ensureChannel: (channelName: string, handlerKey: string) => void;
  _scheduleReconnect: (reason: string) => void;
  _restoreSubscriptions: () => void;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (import.meta.env.VITE_DISABLE_REALTIME === 'true') {
      return null;
    }

    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const projectRef = url?.replace('https://', '').split('.')[0] || 'unknown';
    console.info(`[Realtime] Initializing Supabase realtime client (project: ${projectRef})`);

    supabaseClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
  }

  return supabaseClient;
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  connectionMode: 'polling',
  error: null,
  lastError: null,
  lastConnectedAt: null,
  disabled: import.meta.env.VITE_DISABLE_REALTIME === 'true',
  activeChannels: new Map(),
  eventHandlers: new Map(),
  qrOrderHandlers: new Map(),

  _supabase: null,
  _retryAttempts: 0,
  _retryTimeout: null,

  _initSupabase: () => {
    const state = get();
    if (state.disabled) {
      return;
    }

    if (!state._supabase) {
      const client = getSupabaseClient();
      if (!client) {
        set({
          error: 'Realtime disabled',
          lastError: 'Realtime disabled',
          connectionMode: 'polling',
        });
        return;
      }
      set({ _supabase: client });
    }
  },

  _dispatchUpdate: (handlerKey, update) => {
    const handlers = get().eventHandlers.get(handlerKey);
    if (handlers) {
      handlers.forEach((handler) => handler(update));
    }
  },

  _scheduleReconnect: (reason: string) => {
    const state = get();
    if (state.disabled) {
      return;
    }

    if (state._retryTimeout) {
      clearTimeout(state._retryTimeout);
    }

    const nextAttempt = Math.min(state._retryAttempts + 1, 3);
    const delays = [2000, 5000, 10000];
    const delay = delays[nextAttempt - 1] || 10000;

    const timer = setTimeout(() => {
      set({ _retryTimeout: null });
      get()._restoreSubscriptions();
    }, delay);

    set({
      _retryAttempts: nextAttempt,
      _retryTimeout: timer,
      isConnected: false,
      isConnecting: false,
      connectionMode: 'polling',
      error: reason,
      lastError: reason,
    });
  },

  _ensureChannel: (channelName: string, handlerKey: string) => {
    const state = get();
    
    console.log(`[Realtime] _ensureChannel called for: ${channelName}`);
    
    if (state.disabled) {
      console.warn('[Realtime] ⚠️ Realtime is disabled via environment variable');
      return;
    }
    
    if (state.activeChannels.has(channelName)) {
      console.log(`[Realtime] ℹ️ Channel ${channelName} already exists`);
      return;
    }

    state._initSupabase();
    const fresh = get();
    const supabase = fresh._supabase;

    if (!supabase) {
      console.error('[Realtime] ❌ Supabase client unavailable');
      get()._scheduleReconnect('Supabase realtime client unavailable');
      return;
    }

    let filter = '';
    if (channelName.startsWith('restaurant:') && channelName.endsWith(':orders')) {
      const restaurantId = channelName.split(':')[1];
      filter = `restaurant_id=eq.${restaurantId}`;
      console.log(`[Realtime] 🔍 Creating restaurant orders channel with filter: ${filter}`);
    } else if (channelName.startsWith('order:')) {
      const orderId = channelName.split(':')[1];
      filter = `id=eq.${orderId}`;
      console.log(`[Realtime] 🔍 Creating single order channel with filter: ${filter}`);
    } else {
      console.warn(`[Realtime] Unknown channel format: ${channelName}`);
      return;
    }

    set({ isConnecting: true });
    console.log('[Realtime] 🔄 Setting isConnecting: true');

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter,
        },
        (payload) => {
          console.log(`[Realtime] 📦 Received postgres_changes payload on ${channelName}:`, payload);
          
          const eventType = payload.eventType as RealtimeEvent;
          const order = payload.new as Order;
          const oldOrder = payload.old as Partial<Order>;

          const update: RealtimeOrderUpdate = {
            eventType,
            order,
            oldOrder: eventType === 'UPDATE' ? oldOrder : undefined,
          };

          console.log(`[Realtime] 📤 Dispatching update to handlers:`, update);
          get()._dispatchUpdate(handlerKey, update);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] ✅ Successfully subscribed to ${channelName}`);
          const current = get();
          if (current._retryTimeout) {
            clearTimeout(current._retryTimeout);
          }
          set({
            isConnected: true,
            isConnecting: false,
            connectionMode: 'realtime',
            error: null,
            lastError: null,
            lastConnectedAt: Date.now(),
            _retryAttempts: 0,
            _retryTimeout: null,
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] ❌ Channel error for ${channelName}`);
          get()._scheduleReconnect('Failed to subscribe to realtime channel');
        } else if (status === 'TIMED_OUT') {
          console.error(`[Realtime] ⏱️ Timeout for ${channelName}`);
          get()._scheduleReconnect('Realtime connection timed out');
        } else if (status === 'CLOSED') {
          console.warn(`[Realtime] 🔌 Connection closed for ${channelName}`);
          get()._scheduleReconnect('Realtime connection closed');
        }
      });

    const currentState = get();
    set({
      activeChannels: new Map(currentState.activeChannels).set(channelName, channel),
    });
  },

  _restoreSubscriptions: () => {
    const { eventHandlers, activeChannels } = get();

    activeChannels.forEach((channel) => {
      channel.unsubscribe();
    });

    set({
      activeChannels: new Map(),
      isConnected: false,
      isConnecting: false,
      connectionMode: 'polling',
    });

    eventHandlers.forEach((handlers, key) => {
      if (handlers.size > 0) {
        get()._ensureChannel(key, key);
      }
    });
  },

  subscribeToRestaurantOrders: (restaurantId: string, handler: OrderEventHandler) => {
    const state = get();
    if (state.disabled) {
      return () => {};
    }

    const channelName = `restaurant:${restaurantId}:orders`;
    const handlerKey = channelName;

    const handlers = new Set(state.eventHandlers.get(handlerKey) || []);
    handlers.add(handler);

    set({
      eventHandlers: new Map(state.eventHandlers).set(handlerKey, handlers),
    });

    get()._ensureChannel(channelName, handlerKey);

    return () => {
      const currentState = get();
      const currentHandlers = currentState.eventHandlers.get(handlerKey);
      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler);

      if (currentHandlers.size === 0) {
        const channel = currentState.activeChannels.get(channelName);
        if (channel) {
          channel.unsubscribe();
        }

        const newChannels = new Map(currentState.activeChannels);
        newChannels.delete(channelName);

        const newHandlers = new Map(currentState.eventHandlers);
        newHandlers.delete(handlerKey);

        set({
          activeChannels: newChannels,
          eventHandlers: newHandlers,
          isConnected: newChannels.size > 0,
          connectionMode: newChannels.size > 0 ? currentState.connectionMode : 'polling',
        });
      } else {
        const newHandlers = new Map(currentState.eventHandlers);
        newHandlers.set(handlerKey, currentHandlers);
        set({ eventHandlers: newHandlers });
      }
    };
  },

  subscribeToOrder: (orderId: string, handler: OrderEventHandler) => {
    const state = get();
    if (state.disabled) {
      return () => {};
    }

    const channelName = `order:${orderId}`;
    const handlerKey = channelName;

    const handlers = new Set(state.eventHandlers.get(handlerKey) || []);
    handlers.add(handler);

    set({
      eventHandlers: new Map(state.eventHandlers).set(handlerKey, handlers),
    });

    get()._ensureChannel(channelName, handlerKey);

    return () => {
      const currentState = get();
      const currentHandlers = currentState.eventHandlers.get(handlerKey);
      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler);

      if (currentHandlers.size === 0) {
        const channel = currentState.activeChannels.get(channelName);
        if (channel) {
          channel.unsubscribe();
        }

        const newChannels = new Map(currentState.activeChannels);
        newChannels.delete(channelName);

        const newHandlers = new Map(currentState.eventHandlers);
        newHandlers.delete(handlerKey);

        set({
          activeChannels: newChannels,
          eventHandlers: newHandlers,
          isConnected: newChannels.size > 0,
          connectionMode: newChannels.size > 0 ? currentState.connectionMode : 'polling',
        });
      } else {
        const newHandlers = new Map(currentState.eventHandlers);
        newHandlers.set(handlerKey, currentHandlers);
        set({ eventHandlers: newHandlers });
      }
    };
  },

  subscribeToPendingOrders: (restaurantId: string, handler: QROrderEventHandler) => {
    const state = get();
    if (state.disabled) {
      return () => {};
    }

    state._initSupabase();

    const channelName = `restaurant:${restaurantId}:pending-orders`;
    const handlerKey = channelName;

    const handlers = new Set(state.qrOrderHandlers.get(handlerKey) || []);
    handlers.add(handler);

    set({
      qrOrderHandlers: new Map(state.qrOrderHandlers).set(handlerKey, handlers),
    });

    // Create channel if it doesn't exist
    let channel = state.activeChannels.get(channelName);
    
    if (!channel && state._supabase) {
      console.info(`[Realtime] Creating channel: ${channelName}`);
      
      channel = state._supabase.channel(channelName);

      channel
        .on('broadcast', { event: 'new_qr_order' }, (payload: any) => {
          console.info('[Realtime] New QR order broadcast received:', payload);
          
          const currentHandlers = get().qrOrderHandlers.get(handlerKey);
          if (currentHandlers) {
            currentHandlers.forEach((h) => {
              try {
                h(payload.payload as QROrderPayload);
              } catch (error) {
                console.error('[Realtime] Error in QR order handler:', error);
              }
            });
          }
        })
        .subscribe((status) => {
          console.info(`[Realtime] Channel ${channelName} status:`, status);
          
          if (status === 'SUBSCRIBED') {
            set({
              isConnected: true,
              connectionMode: 'realtime',
              lastConnectedAt: Date.now(),
              error: null,
              _retryAttempts: 0,
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            set({ error: `Channel ${channelName} error: ${status}` });
          }
        });

      const newChannels = new Map(state.activeChannels);
      newChannels.set(channelName, channel);
      set({ activeChannels: newChannels });
    }

    return () => {
      const currentState = get();
      const currentHandlers = currentState.qrOrderHandlers.get(handlerKey);
      if (!currentHandlers) {
        return;
      }

      currentHandlers.delete(handler);

      if (currentHandlers.size === 0) {
        const channel = currentState.activeChannels.get(channelName);
        if (channel) {
          channel.unsubscribe();
        }

        const newChannels = new Map(currentState.activeChannels);
        newChannels.delete(channelName);

        const newHandlers = new Map(currentState.qrOrderHandlers);
        newHandlers.delete(handlerKey);

        set({
          activeChannels: newChannels,
          qrOrderHandlers: newHandlers,
          isConnected: newChannels.size > 0,
          connectionMode: newChannels.size > 0 ? currentState.connectionMode : 'polling',
        });
      } else {
        const newHandlers = new Map(currentState.qrOrderHandlers);
        newHandlers.set(handlerKey, currentHandlers);
        set({ qrOrderHandlers: newHandlers });
      }
    };
  },

  unsubscribeAll: () => {
    const { activeChannels, _supabase, _retryTimeout } = get();

    activeChannels.forEach((channel) => {
      channel.unsubscribe();
    });

    if (_retryTimeout) {
      clearTimeout(_retryTimeout);
    }

    if (_supabase) {
      try {
        _supabase.realtime.disconnect();
      } catch {
        // ignore
      }
    }

    set({
      activeChannels: new Map(),
      eventHandlers: new Map(),
      qrOrderHandlers: new Map(),
      isConnected: false,
      isConnecting: false,
      connectionMode: 'polling',
      error: null,
      _retryAttempts: 0,
      _retryTimeout: null,
    });
  },

  reconnect: async () => {
    const { unsubscribeAll } = get();

    unsubscribeAll();
    supabaseClient = null;

    set({
      _supabase: null,
      error: null,
      lastError: null,
      disabled: import.meta.env.VITE_DISABLE_REALTIME === 'true',
      connectionMode: 'polling',
    });
  },
}));
