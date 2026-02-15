/**
 * Phase 0 - Global Loading Store
 * 
 * Centralized loading state management using Zustand.
 * Tracks active API requests by key to support concurrent operations.
 * 
 * Usage in stores:
 * 
 * ```ts
 * import { useLoadingStore } from '@/stores/ui/loading.store';
 * 
 * async function fetchProducts() {
 *   const { startLoading, stopLoading } = useLoadingStore.getState();
 *   const loadingKey = 'products:fetch';
 *   
 *   startLoading(loadingKey);
 *   try {
 *     const response = await api.get('/products');
 *     return response.data;
 *   } finally {
 *     stopLoading(loadingKey);
 *   }
 * }
 * ```
 * 
 * Usage in components:
 * 
 * ```tsx
 * import { useLoadingStore } from '@/stores/ui/loading.store';
 * 
 * function ProductList() {
 *   const isLoadingProducts = useLoadingStore((state) => state.isLoading('products:fetch'));
 *   const isAnyLoading = useLoadingStore((state) => state.isLoading());
 *   
 *   if (isLoadingProducts) return <Spinner />;
 *   // ...
 * }
 * ```
 */

import { create } from 'zustand';

interface LoadingState {
  /**
   * Set of active loading keys.
   * Example: Set(['products:fetch', 'orders:create'])
   */
  activeKeys: Set<string>;

  /**
   * Global loading counter (deprecated, use keys instead).
   * Kept for backward compatibility.
   */
  count: number;

  /**
   * Starts loading for a specific key.
   * If no key provided, increments global counter.
   * 
   * @param key - Unique identifier for this loading operation
   */
  startLoading: (key?: string) => void;

  /**
   * Stops loading for a specific key.
   * If no key provided, decrements global counter.
   * 
   * @param key - Unique identifier for this loading operation
   */
  stopLoading: (key?: string) => void;

  /**
   * Checks if a specific key is loading, or if anything is loading.
   * 
   * @param key - Optional key to check. If omitted, returns true if any operation is loading.
   * @returns true if loading
   */
  isLoading: (key?: string) => boolean;

  /**
   * Clears all loading state.
   * Useful for cleanup on logout or navigation.
   */
  clearAll: () => void;

  /**
   * Returns all active loading keys (for debugging).
   */
  getActiveKeys: () => string[];
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  activeKeys: new Set(),
  count: 0,

  startLoading: (key?: string) => {
    set((state) => {
      if (key) {
        const newKeys = new Set(state.activeKeys);
        newKeys.add(key);
        return { activeKeys: newKeys };
      } else {
        return { count: state.count + 1 };
      }
    });
  },

  stopLoading: (key?: string) => {
    set((state) => {
      if (key) {
        const newKeys = new Set(state.activeKeys);
        newKeys.delete(key);
        return { activeKeys: newKeys };
      } else {
        return { count: Math.max(0, state.count - 1) };
      }
    });
  },

  isLoading: (key?: string) => {
    const state = get();
    
    if (key) {
      return state.activeKeys.has(key);
    }
    
    // If no key provided, check if anything is loading
    return state.activeKeys.size > 0 || state.count > 0;
  },

  clearAll: () => {
    set({ activeKeys: new Set(), count: 0 });
  },

  getActiveKeys: () => {
    return Array.from(get().activeKeys);
  },
}));

/**
 * Helper hook to check if any operation is loading.
 * Useful for global loading indicators.
 */
export function useIsAnyLoading(): boolean {
  return useLoadingStore((state) => state.isLoading());
}

/**
 * Helper hook to check if a specific key is loading.
 * 
 * @param key - Loading key to check
 */
export function useIsLoading(key: string): boolean {
  return useLoadingStore((state) => state.isLoading(key));
}
