/**
 * Product & Category Domain Types
 * Phase 3: Products & Categories (Tenant Core Data)
 *
 * These types match the backend Prisma schema and API responses.
 * Do NOT add fields that don't exist in the backend.
 */

// ============================================================
// CATEGORY TYPES
// ============================================================

export interface Category {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  // description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  _count?: {
    products: number;
  };
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  image_url: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  image_url?: string;
  image?: {
    file_base64: string;
    content_type: string;
  };
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  image_url?: string;
  image?: {
    file_base64: string;
    content_type: string;
  };
}

export interface ReorderCategoriesPayload {
  categories: Array<{
    id: string;
    sortOrder: number;
  }>;
}

// ============================================================
// PRODUCT TYPES
// ============================================================

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string; // Decimal comes as string from Prisma
  costprice: string | null; // Backend uses costprice, not cost_price
  is_active: boolean; // Backend maps is_available to is_active
  is_veg: boolean | null;
  preparation_time_minutes: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  images: ProductImage[];
  discount_percent?: string; // Decimal comes as string from Prisma
  category?: Category;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  is_active: boolean;
  category_id: string;
  images: Array<{
    id: string;
    storage_path: string;
    public_url: string | null;
    sort_order: number;
  }>;
  discount_percent?: string;
}

export interface CreateProductPayload {
  name: string;
  description?: string;
  price: string | number;
  costPrice?: string | number;
  categoryId?: string;

  isAvailable?: boolean;
  isVeg?: boolean | null;
  preparationTimeMinutes?: number;
  discount_percent?: string | number;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: string | number;
  costPrice?: string | number;
  categoryId?: string;

  isAvailable?: boolean;
  isVeg?: boolean | null;
  preparationTimeMinutes?: number;
  discount_percent?: string | number;
}

export interface UploadProductImagePayload {
  file_base64: string;
  content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  sort_order?: number;
}

// ============================================================
// PUBLIC MENU TYPES (Read-only, customer-facing)
// ============================================================

export interface PublicMenuRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
}

export interface PublicMenuSettings {
  opening_hours: unknown;
  currency: string;
  tax_included: boolean;
}

export interface PublicMenuTheme {
  theme_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_scale: 'SM' | 'MD' | 'LG';
}

export interface PublicMenu {
  restaurant: PublicMenuRestaurant;
  settings: PublicMenuSettings | null;
  theme: PublicMenuTheme | null;
  products: PublicProduct[];
  categories: PublicCategory[];
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiError {
  code: string;
  message: string;
}

export interface CategoryListResponse {
  data: Category[];
}

export interface CategoryResponse {
  data: Category;
}

export interface ProductListResponse {
  products: Product[]; // Backend returns { products: Product[] }
}

export interface ProductResponse extends Product {
  // Backend returns Product directly, not wrapped in { data }
}

export interface PublicMenuResponse {
  data: PublicMenu;
}

export interface PublicCategoriesResponse {
  data: PublicCategory[];
}
