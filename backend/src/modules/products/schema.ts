import { z } from 'zod';

export const createProductSchema = z
  .object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val),
    costPrice: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),

    categoryId: z.string().min(1).optional(),
    isAvailable: z.boolean().optional(),
    isVeg: z.boolean().nullable().optional(),
    preparationTimeMinutes: z.number().int().positive().optional(),
    discount_percent: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    price: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),
    costPrice: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),

    categoryId: z.string().min(1).optional(),
    isAvailable: z.boolean().optional(),
    isVeg: z.boolean().nullable().optional(),
    preparationTimeMinutes: z.number().int().positive().optional(),
    discount_percent: z.union([z.number(), z.string()]).transform((val) => typeof val === 'string' ? parseFloat(val) : val).optional(),
  })
  .strict();

export const uploadProductImageSchema = z
  .object({
    file_base64: z.string().min(10),
    content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    sort_order: z.number().int().min(0).max(100).optional(),
  })
  .strict();
