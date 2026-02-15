/**
 * Restaurant domain types
 * Matches backend Prisma schema and API responses
 */

export type Restaurant = {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  address: string | null;
  gst_number: string | null;
  tagline: string | null;
  restaurant_type: string | null;
  opening_hours: Record<string, unknown> | null;
  closing_hours: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RestaurantSettings = {
  id: string;
  restaurant_id: string;
  opening_hours: Record<string, unknown> | null;
  currency: string;
  tax_included: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantThemeSettings = {
  id: string;
  restaurant_id: string;
  theme_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_scale: 'SM' | 'MD' | 'LG';
  created_at: string;
  updated_at: string;
};

export type RestaurantProfile = Restaurant & {
  settings?: RestaurantSettings;
  theme_settings?: RestaurantThemeSettings;
};

// Update payloads
export type UpdateRestaurantProfilePayload = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  address?: string | null;
  gst_number?: string | null;
  tagline?: string | null;
  restaurant_type?: string | null;
  opening_hours?: Record<string, unknown> | null;
  closing_hours?: Record<string, unknown> | null;
};

export type UpdateRestaurantSettingsPayload = {
  opening_hours?: Record<string, unknown>;
  currency?: string;
  tax_included?: boolean;
};

export type UpdateRestaurantThemePayload = {
  theme_id: string;
};
