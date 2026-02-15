/**
 * Realtime Store
 * Phase 4: Orders & Order Lifecycle
 *
 * Central hub for all Supabase Realtime connections.
 * Isolates all realtime logic from other stores and components.
 *
 * Key responsibilities:
 * - Manage Supabase channel subscriptions
 * - Handle reconnection logic
 * - Expose realtime events to other stores
 * - Prevent memory leaks
 * - Ensure no duplicate subscriptions
 *
 * Architecture:
 * - Other stores subscribe to events via callback registration
 * - This store manages the actual Supabase connection
 * - Connection state is tracked and exposed
 */

import { create } from 'zustand';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Order, RealtimeOrderUpdate, RealtimeEvent } from '@/types/order';

// ============================================================
// TYPES
// ============================================================

type OrderEventHandler = (update: RealtimeOrderUpdate) => void;

interface RealtimeState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  disabled: boolean;
  
  // Active subscriptions
  activeChannels: Map<string, RealtimeChannel>;
  eventHandlers: Map<string, Set<OrderEventHandler>>;

  // Actions
  subscribeToRestaurantOrders: (restaurantId: string, handler: OrderEventHandler) => () => void;
  subscribeToOrder: (orderId: string, handler: OrderEventHandler) => () => void;
  unsubscribeAll: () => void;
  reconnect: () => Promise<void>;
  
  // Internal
  _supabase: ReturnType<typeof createClient> | null;
  _initSupabase: () => void;
}

// ============================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    if (import.meta.env.VITE_DISABLE_REALTIME === 'true') {
      return null;
    }
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

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------
  
  isConnected: false,
  isConnecting: false,
  error: null,
  disabled: import.meta.env.VITE_DISABLE_REALTIME === 'true',
  activeChannels: new Map(),
  eventHandlers: new Map(),
  _supabase: null,

  // ----------------------------------------------------------
  // INITIALIZE SUPABASE
  // ----------------------------------------------------------

  _initSupabase: () => {
    const state = get();
    if (state.disabled) {
      return;
    }
    if (!state._supabase) {
      const client = getSupabaseClient();
      if (!client) {
        set({ disabled: true, error: 'Realtime disabled' });
        return;
      }
      set({ _supabase: client });
    }
  },

  // ----------------------------------------------------------
  // SUBSCRIBE TO ALL RESTAURANT ORDERS
  // Used by: Admin Orders Store, KDS Store
  // ----------------------------------------------------------

  subscribeToRestaurantOrders: (restaurantId: string, handler: OrderEventHandler) => {
    const state = get();
    if (state.disabled) {
      return () => {};
    }
    state._initSupabase();
    
    // Get updated state after init
    const updatedState = get();
    
    const channelName = `restaurant:${restaurantId}:orders`;
    const handlerKey = channelName;

    // Register handler
    const handlers = updatedState.eventHandlers.get(handlerKey) || new Set();
    handlers.add(handler);
    set({ 
      eventHandlers: new Map(updatedState.eventHandlers).set(handlerKey, handlers) 
    });

    // Create channel if it doesn't exist
    if (!updatedState.activeChannels.has(channelName)) {
      const supabase = updatedState._supabase;
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return () => {}; // Return empty unsubscribe function
      }
      
      set({ isConnecting: true });

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            const eventType = payload.eventType as RealtimeEvent;
            const order = payload.new as Order;
            const oldOrder = payload.old as Partial<Order>;

            const update: RealtimeOrderUpdate = {
              eventType,
              order,
              oldOrder: eventType === 'UPDATE' ? oldOrder : undefined,
            };

            // Notify all handlers for this channel
            const currentHandlers = get().eventHandlers.get(handlerKey);
            if (currentHandlers) {
              currentHandlers.forEach((h) => h(update));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            set({ isConnected: true, isConnecting: false, error: null });
          } else if (status === 'CHANNEL_ERROR') {
            try {
              supabase.removeAllChannels();
              supabase.realtime.disconnect();
              localStorage.setItem('disable_realtime', 'true');
            } catch {
              // ignore
            }
            set({ 
              isConnected: false, 
              isConnecting: false, 
              error: 'Failed to subscribe to realtime channel',
              disabled: true,
              activeChannels: new Map(),
              eventHandlers: new Map(),
            });
          } else if (status === 'TIMED_OUT') {
            try {
              supabase.removeAllChannels();
              supabase.realtime.disconnect();
              localStorage.setItem('disable_realtime', 'true');
            } catch {
              // ignore
            }
            set({ 
              isConnected: false, 
              isConnecting: false, 
              error: 'Realtime connection timed out',
              disabled: true,
              activeChannels: new Map(),
              eventHandlers: new Map(),
            });
          }
        });

      const currentState = get();
      set({ 
        activeChannels: new Map(currentState.activeChannels).set(channelName, channel) 
      });
    }

    // Return unsubscribe function
    return () => {
      const currentState = get();
      const handlers = currentState.eventHandlers.get(handlerKey);
      
      if (handlers) {
        handlers.delete(handler);
        
        // If no more handlers, unsubscribe from channel
        if (handlers.size === 0) {
          const channel = currentState.activeChannels.get(channelName);
          if (channel) {
            channel.unsubscribe();
            
            const newChannels = new Map(currentState.activeChannels);
            newChannels.delete(channelName);
            
            const newHandlers = new Map(currentState.eventHandlers);
            newHandlers.delete(handlerKey);
            
            set({ 
              activeChannels: newChannels,
              eventHandlers: newHandlers,
              isConnected: newChannels.size > 0,
            });
          }
        }
      }
    };
  },

  // ----------------------------------------------------------
  // SUBSCRIBE TO SINGLE ORDER
  // Used by: Customer Orders Store
  // ----------------------------------------------------------

  subscribeToOrder: (orderId: string, handler: OrderEventHandler) => {
    const state = get();
    if (state.disabled) {
      return () => {};
    }
    state._initSupabase();
    
    // Get updated state after init
    const updatedState = get();
    
    const channelName = `order:${orderId}`;
    const handlerKey = channelName;

    // Register handler
    const handlers = updatedState.eventHandlers.get(handlerKey) || new Set();
    handlers.add(handler);
    set({ 
      eventHandlers: new Map(updatedState.eventHandlers).set(handlerKey, handlers) 
    });

    // Create channel if it doesn't exist
    if (!updatedState.activeChannels.has(channelName)) {
      const supabase = updatedState._supabase;
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        return () => {}; // Return empty unsubscribe function
      }
      
      set({ isConnecting: true });

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`,
          },
          (payload) => {
            const eventType = payload.eventType as RealtimeEvent;
            const order = payload.new as Order;
            const oldOrder = payload.old as Partial<Order>;

            const update: RealtimeOrderUpdate = {
              eventType,
              order,
              oldOrder: eventType === 'UPDATE' ? oldOrder : undefined,
            };

            // Notify all handlers for this channel
            const currentHandlers = get().eventHandlers.get(handlerKey);
            if (currentHandlers) {
              currentHandlers.forEach((h) => h(update));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            set({ isConnected: true, isConnecting: false, error: null });
          } else if (status === 'CHANNEL_ERROR') {
            try {
              supabase.removeAllChannels();
              supabase.realtime.disconnect();
              localStorage.setItem('disable_realtime', 'true');
            } catch {
              // ignore
            }
            set({ 
              isConnected: false, 
              isConnecting: false, 
              error: 'Failed to subscribe to order updates',
              disabled: true,
              activeChannels: new Map(),
              eventHandlers: new Map(),
            });
          } else if (status === 'TIMED_OUT') {
            try {
              supabase.removeAllChannels();
              supabase.realtime.disconnect();
              localStorage.setItem('disable_realtime', 'true');
            } catch {
              // ignore
            }
            set({ 
              isConnected: false, 
              isConnecting: false, 
              error: 'Order subscription timed out',
              disabled: true,
              activeChannels: new Map(),
              eventHandlers: new Map(),
            });
          }
        });

      const currentState = get();
      set({ 
        activeChannels: new Map(currentState.activeChannels).set(channelName, channel) 
      });
    }

    // Return unsubscribe function
    return () => {
      const currentState = get();
      const handlers = currentState.eventHandlers.get(handlerKey);
      
      if (handlers) {
        handlers.delete(handler);
        
        // If no more handlers, unsubscribe from channel
        if (handlers.size === 0) {
          const channel = currentState.activeChannels.get(channelName);
          if (channel) {
            channel.unsubscribe();
            
            const newChannels = new Map(currentState.activeChannels);
            newChannels.delete(channelName);
            
            const newHandlers = new Map(currentState.eventHandlers);
            newHandlers.delete(handlerKey);
            
            set({ 
              activeChannels: newChannels,
              eventHandlers: newHandlers,
              isConnected: newChannels.size > 0,
            });
          }
        }
      }
    };
  },

  // ----------------------------------------------------------
  // UNSUBSCRIBE ALL
  // ----------------------------------------------------------

  unsubscribeAll: () => {
    const { activeChannels, _supabase } = get();
    
    if (_supabase) {
      activeChannels.forEach((channel) => {
        channel.unsubscribe();
      });
      try {
        _supabase.realtime.disconnect();
      } catch {
        // ignore
      }
    }

    set({
      activeChannels: new Map(),
      eventHandlers: new Map(),
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  },

  // ----------------------------------------------------------
  // RECONNECT
  // ----------------------------------------------------------

  reconnect: async () => {
    const { unsubscribeAll } = get();
    
    // Clear all subscriptions
    unsubscribeAll();
    
    // Reset Supabase client
    supabaseClient = null;
    set({ _supabase: null, error: null, disabled: false });
    
    // Handlers will need to re-subscribe
    // This is intentional - stores should handle reconnection
  },
}));
