/**
 * Categories Store
 * Phase 3: Products & Categories (Tenant Core Data)
 *
 * Manages restaurant categories with full CRUD operations.
 * Categories are restaurant-scoped and require ADMIN/MANAGER role for mutations.
 *
 * Key behaviors:
 * - Categories load BEFORE products (products depend on categories)
 * - Deletion is BLOCKED if category has products
 * - Reordering is supported via batch update
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import type {
  ApiError,
  Category,
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryPayload,
  ReorderCategoriesPayload,
  UpdateCategoryPayload,
} from '@/types/product';

// ============================================================
// STORE STATE
// ============================================================

interface CategoriesState {
  // Data
  categories: Category[];

  // UI State
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: ApiError | null;

  // Computed helpers
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  activeCategories: () => Category[];

  // Actions
  fetchCategories: () => Promise<void>;
  createCategory: (data: CreateCategoryPayload) => Promise<Category | null>;
  updateCategory: (id: string, data: UpdateCategoryPayload) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (data: ReorderCategoriesPayload) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  categories: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  error: null,
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // COMPUTED HELPERS
  // ----------------------------------------------------------

  getCategoryById: (id: string) => {
    return get().categories.find((c) => c.id === id);
  },

  getCategoryByName: (name: string) => {
    return get().categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
  },

  activeCategories: () => {
    return get().categories.filter((c) => c.is_active);
  },

  // ----------------------------------------------------------
  // FETCH CATEGORIES
  // ----------------------------------------------------------

  fetchCategories: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<CategoryListResponse>('/categories');

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      set({
        categories: response.data?.data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch categories',
        },
        loading: false,
      });
    }
  },

  // ----------------------------------------------------------
  // CREATE CATEGORY
  // ----------------------------------------------------------

  createCategory: async (data: CreateCategoryPayload) => {
    set({ creating: true, error: null });

    try {
      const response = await apiClient.post<CategoryResponse>('/categories/add', data);

      if (response.error) {
        set({ error: response.error, creating: false });
        return null;
      }

      const newCategory = response.data?.data;
      if (newCategory) {
        set((state) => ({
          categories: [...state.categories, newCategory].sort(
            (a, b) => a.sort_order - b.sort_order
          ),
          creating: false,
          error: null,
        }));
        return newCategory;
      }

      set({ creating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create category',
        },
        creating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // UPDATE CATEGORY
  // ----------------------------------------------------------

  updateCategory: async (id: string, data: UpdateCategoryPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<CategoryResponse>(`/categories/${id}`, data);

      if (response.error) {
        set({ error: response.error, updating: false });
        return null;
      }

      const updatedCategory = response.data?.data;
      if (updatedCategory) {
        set((state) => ({
          categories: state.categories
            .map((c) => (c.id === id ? updatedCategory : c))
            .sort((a, b) => a.sort_order - b.sort_order),
          updating: false,
          error: null,
        }));
        return updatedCategory;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update category',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // DELETE CATEGORY
  // Backend will reject if category has products
  // ----------------------------------------------------------

  deleteCategory: async (id: string) => {
    set({ deleting: true, error: null });

    try {
      const response = await apiClient.delete(`/categories/${id}`);

      if (response.error) {
        set({ error: response.error, deleting: false });
        return false;
      }

      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        deleting: false,
        error: null,
      }));

      return true;
    } catch (error) {
      set({
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete category',
        },
        deleting: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // REORDER CATEGORIES
  // ----------------------------------------------------------

  reorderCategories: async (data: ReorderCategoriesPayload) => {
    set({ updating: true, error: null });

    // Optimistic update
    const previousCategories = get().categories;
    const reorderedCategories = previousCategories.map((cat) => {
      const update = data.categories.find((c) => c.id === cat.id);
      if (update) {
        return { ...cat, sort_order: update.sortOrder };
      }
      return cat;
    }).sort((a, b) => a.sort_order - b.sort_order);

    set({ categories: reorderedCategories });

    try {
      const response = await apiClient.patch('/categories/reorder', data);

      if (response.error) {
        // Rollback on error
        set({ categories: previousCategories, error: response.error, updating: false });
        return false;
      }

      set({ updating: false, error: null });
      return true;
    } catch (error) {
      // Rollback on error
      set({
        categories: previousCategories,
        error: {
          code: 'REORDER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reorder categories',
        },
        updating: false,
      });
      return false;
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
