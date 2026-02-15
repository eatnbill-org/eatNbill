/**
 * Products Store
 * Phase 3: Products & Categories (Tenant Core Data)
 *
 * Manages restaurant products with full CRUD and image operations.
 * Products are restaurant-scoped and require ADMIN/MANAGER role for mutations.
 *
 * Key behaviors:
 * - Products belong to categories (category must exist before product creation)
 * - Supports image upload/delete
 * - Supports filtering by category
 * - Availability and visibility are separate concerns (is_active)
 */

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import type {
  ApiError,
  CreateProductPayload,
  Product,
  ProductImage,
  ProductListResponse,
  ProductResponse,
  UpdateProductPayload,
  UploadProductImagePayload,
} from '@/types/product';

// ============================================================
// STORE STATE
// ============================================================

interface ProductsState {
  // Data
  products: Product[];

  // UI State
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  uploadingImage: boolean;
  error: ApiError | null;

  // Filter state
  selectedCategoryId: string | null;

  // Computed helpers
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (categoryId: string) => Product[];
  activeProducts: () => Product[];
  filteredProducts: () => Product[];

  // Actions
  fetchProducts: () => Promise<void>;
  createProduct: (data: CreateProductPayload) => Promise<Product | null>;
  updateProduct: (id: string, data: UpdateProductPayload) => Promise<Product | null>;
  deleteProduct: (id: string) => Promise<boolean>;

  // Image actions
  uploadProductImage: (productId: string, data: UploadProductImagePayload) => Promise<ProductImage | null>;
  deleteProductImage: (productId: string, imageId: string) => Promise<boolean>;

  // Filter actions
  setSelectedCategory: (categoryId: string | null) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

// ============================================================
// INITIAL STATE
// ============================================================

const initialState = {
  products: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  uploadingImage: false,
  error: null,
  selectedCategoryId: null,
};

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useProductsStore = create<ProductsState>((set, get) => ({
  ...initialState,

  // ----------------------------------------------------------
  // COMPUTED HELPERS
  // ----------------------------------------------------------

  getProductById: (id: string) => {
    return get().products.find((p) => p.id === id);
  },

  getProductsByCategory: (categoryId: string) => {
    return get().products.filter((p) => p.category_id === categoryId);
  },

  activeProducts: () => {
    return get().products.filter((p) => p.is_active);
  },

  filteredProducts: () => {
    const { products, selectedCategoryId } = get();
    if (!selectedCategoryId) return products;
    return products.filter((p) => p.category_id === selectedCategoryId);
  },

  // ----------------------------------------------------------
  // FETCH PRODUCTS
  // ----------------------------------------------------------

  fetchProducts: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<ProductListResponse>('/products');

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      set({
        products: response.data?.products || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch products',
        },
        loading: false,
      });
    }
  },

  // ----------------------------------------------------------
  // CREATE PRODUCT
  // ----------------------------------------------------------

  createProduct: async (data: CreateProductPayload) => {
    set({ creating: true, error: null });

    try {
      const response = await apiClient.post<Product>('/products', data);

      if (response.error) {
        set({ error: response.error, creating: false });
        return null;
      }

      const newProduct = response.data;
      if (newProduct) {
        set((state) => ({
          products: [newProduct, ...state.products],
          creating: false,
          error: null,
        }));
        return newProduct;
      }

      set({ creating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create product',
        },
        creating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // UPDATE PRODUCT
  // ----------------------------------------------------------

  updateProduct: async (id: string, data: UpdateProductPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<Product>(`/products/${id}`, data);

      if (response.error) {
        set({ error: response.error, updating: false });
        return null;
      }

      const updatedProduct = response.data;
      if (updatedProduct) {
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
          updating: false,
          error: null,
        }));
        return updatedProduct;
      }

      set({ updating: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update product',
        },
        updating: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // DELETE PRODUCT (soft delete)
  // ----------------------------------------------------------

  deleteProduct: async (id: string) => {
    set({ deleting: true, error: null });

    try {
      const response = await apiClient.delete(`/products/${id}`);

      if (response.error) {
        set({ error: response.error, deleting: false });
        return false;
      }

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        deleting: false,
        error: null,
      }));

      return true;
    } catch (error) {
      set({
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete product',
        },
        deleting: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // UPLOAD PRODUCT IMAGE
  // ----------------------------------------------------------

  uploadProductImage: async (productId: string, data: UploadProductImagePayload) => {
    set({ uploadingImage: true, error: null });

    try {
      const response = await apiClient.post<{ data: ProductImage }>(
        `/products/${productId}/images`,
        data
      );

      if (response.error) {
        set({ error: response.error, uploadingImage: false });
        return null;
      }

      const newImage = response.data?.data;
      if (newImage) {
        // Update the product's images array
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id === productId) {
              return {
                ...p,
                images: [...p.images, newImage].sort((a, b) => a.sort_order - b.sort_order),
              };
            }
            return p;
          }),
          uploadingImage: false,
          error: null,
        }));
        return newImage;
      }

      set({ uploadingImage: false });
      return null;
    } catch (error) {
      set({
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload image',
        },
        uploadingImage: false,
      });
      return null;
    }
  },

  // ----------------------------------------------------------
  // DELETE PRODUCT IMAGE
  // ----------------------------------------------------------

  deleteProductImage: async (productId: string, imageId: string) => {
    set({ uploadingImage: true, error: null });

    try {
      const response = await apiClient.delete(`/products/${productId}/images/${imageId}`);

      if (response.error) {
        set({ error: response.error, uploadingImage: false });
        return false;
      }

      // Remove the image from the product's images array
      set((state) => ({
        products: state.products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              images: p.images.filter((img) => img.id !== imageId),
            };
          }
          return p;
        }),
        uploadingImage: false,
        error: null,
      }));

      return true;
    } catch (error) {
      set({
        error: {
          code: 'DELETE_IMAGE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete image',
        },
        uploadingImage: false,
      });
      return false;
    }
  },

  // ----------------------------------------------------------
  // FILTER ACTIONS
  // ----------------------------------------------------------

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategoryId: categoryId });
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
