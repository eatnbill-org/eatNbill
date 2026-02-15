/**
 * Public Menu Store
 * Phase 3: Products & Categories (Tenant Core Data)
 *
 * READ-ONLY store for customer-facing menu display.
 * Uses `/api/v1/public/:slug/menu` endpoint - NO authentication required.
 *
 * CRITICAL SEPARATION:
 * - This store is COMPLETELY SEPARATE from admin stores (products, categories)
 * - Never import or use admin stores in public contexts
 * - Never expose hidden/unavailable products
 * - All data is fetched via public endpoints only
 *
 * Use cases:
 * - Customer menu page (QR code scanning)
 * - Public storefront preview
 * - Embedded menu widgets
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import type {
  ApiError,
  PublicCategory,
  PublicMenu,
  PublicMenuResponse,
  PublicProduct,
} from '@/types/product';

// ============================================================
// STORE STATE
// ============================================================

interface PublicMenuState {
  // Restaurant context
  restaurantSlug: string | null;

  // Data (all read-only from public API)
  menu: PublicMenu | null;

  // UI State
  loading: boolean;
  error: ApiError | null;

  // Computed helpers
  products: () => PublicProduct[];
  categories: () => PublicCategory[];
  getProductsByCategory: (categoryId: string) => PublicProduct[];
  restaurantInfo: () => PublicMenu['restaurant'] | null;
  settings: () => PublicMenu['settings'] | null;
  theme: () => PublicMenu['theme'] | null;

  // Actions
  fetchMenu: (restaurantSlug: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  restaurantSlug: null,
  menu: null,
  loading: false,
  error: null,
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const usePublicMenuStore = create<PublicMenuState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // COMPUTED HELPERS
  // ----------------------------------------------------------

  products: () => {
    return get().menu?.products || [];
  },

  categories: () => {
    return get().menu?.categories || [];
  },

  getProductsByCategory: (categoryId: string) => {
    const products = get().menu?.products || [];
    return products.filter((p) => p.category_id === categoryId);
  },

  restaurantInfo: () => {
    return get().menu?.restaurant || null;
  },

  settings: () => {
    return get().menu?.settings || null;
  },

  theme: () => {
    return get().menu?.theme || null;
  },

  // ----------------------------------------------------------
  // FETCH PUBLIC MENU
  // This is the ONLY data fetch method - read-only, no auth
  // ----------------------------------------------------------

  fetchMenu: async (restaurantSlug: string) => {
    // Skip if already loading same menu
    if (get().loading && get().restaurantSlug === restaurantSlug) {
      return;
    }

    set({ loading: true, error: null, restaurantSlug });

    try {
      // Use public endpoint - no auth required
      const response = await apiClient.get<PublicMenuResponse>(
        `/public/${restaurantSlug}/menu`
      );

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      set({
        menu: ((response.data as unknown as PublicMenuResponse)?.data as PublicMenu) || (response.data as unknown as PublicMenu) || null,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to load menu',
        },
        loading: false,
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
    set(initialState);
  },
}));
