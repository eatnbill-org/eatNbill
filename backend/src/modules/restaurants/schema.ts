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

export const bulkCreateTablesSchema = z
  .object({
    tables: z.array(createTableSchema).min(1).max(50),
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

export const updateTableStatusSchema = z
  .object({
    table_status: z.enum(["AVAILABLE", "RESERVED"]),
  })
  .strict();

export const deleteTableQRCodesSchema = z
  .object({
    mode: z.enum(['ALL', 'HALL', 'RANGE', 'SELECTED']),
    hall_id: z.string().uuid().optional(),
    range_start: z.number().int().positive().optional(),
    range_end: z.number().int().positive().optional(),
    table_ids: z.array(z.string().uuid()).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.mode === 'HALL' && !data.hall_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hall_id is required when mode is HALL',
        path: ['hall_id'],
      });
    }

    if (data.mode === 'RANGE') {
      if (typeof data.range_start !== 'number' || typeof data.range_end !== 'number') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'range_start and range_end are required when mode is RANGE',
          path: ['range_start'],
        });
      } else if (data.range_start > data.range_end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'range_start must be less than or equal to range_end',
          path: ['range_start'],
        });
      }
    }

    if (data.mode === 'SELECTED' && (!data.table_ids || data.table_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'table_ids is required when mode is SELECTED',
        path: ['table_ids'],
      });
    }
  });

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
