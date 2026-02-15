import { z } from 'zod';

export const createRestaurantSchema = z
  .object({
    name: z.string().min(2).max(200),
    phone: z.string().min(10).max(50).optional().nullable(),
    email: z.string().email().optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    gst_number: z.string().max(50).optional().nullable(),
  })
  .strict();

export const updateRestaurantProfileSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    phone: z.string().min(10).max(50).optional().nullable(),
    email: z.string().email().optional().nullable(),
    logo_url: z.string().url().optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    gst_number: z.string().max(50).optional().nullable(),
    tagline: z.string().max(200).optional().nullable(),
    restaurant_type: z.string().max(100).optional().nullable(),
    opening_hours: z.any().optional().nullable(),
    closing_hours: z.any().optional().nullable(),
  })
  .strict();

export const updateRestaurantSlugSchema = z
  .object({
    slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  })
  .strict();

export const updateRestaurantSettingsSchema = z
  .object({
    opening_hours: z.any().optional(),
    currency: z.string().min(1).max(10).optional(),
    tax_included: z.boolean().optional(),
  })
  .strict();

export const updateRestaurantThemeSchema = z
  .object({
    theme_id: z.enum([
      'standard',
      'classic',
      'modern',
      'minimal',
      'grid',
      'dark',
      'slider',
      'vintage_70s',
      'retro_50s',
      'urban_hiphop',
      'mod_60s',
      'alice',
      'lotr',
      'glamping'
    ]),
  })
  .strict();

export const createHallSchema = z
  .object({
    name: z.string().min(2).max(100),
    is_ac: z.boolean().optional(),
  })
  .strict();

export const updateHallSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    is_ac: z.boolean().optional(),
  })
  .strict();

export const createTableSchema = z
  .object({
    hall_id: z.string().uuid(),
    table_number: z.string().min(1).max(50),
    seats: z.number().int().min(1).max(50),
    is_active: z.boolean().optional(),
  })
  .strict();

export const updateTableSchema = z
  .object({
    hall_id: z.string().uuid().optional(),
    table_number: z.string().min(1).max(50).optional(),
    seats: z.number().int().min(1).max(50).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const createRestaurantUserSchema = z
  .object({
    user_id: z.string().uuid(),
    role: z.enum(['OWNER', 'MANAGER', 'WAITER']),
    is_active: z.boolean().optional(),
  })
  .strict();

export const updateRestaurantUserSchema = z
  .object({
    role: z.enum(['OWNER', 'MANAGER', 'WAITER']).optional(),
    is_active: z.boolean().optional(),
  })
  .strict();
