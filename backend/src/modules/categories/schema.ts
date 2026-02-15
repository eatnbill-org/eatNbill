import { z } from 'zod';

export const createCategorySchema = z
  .object({
    name: z.string().min(2).max(100),
    isActive: z.boolean().optional(),
    image: z.object({
      file_base64: z.string(),
      content_type: z.string(),
    }).optional(),
    image_url: z.string().optional(),
    description : z.string().max(125).optional(),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
    image: z.object({
      file_base64: z.string(),
      content_type: z.string(),
    }).optional(),
    image_url: z.string().optional(),
  })
  .strict();

export const reorderCategoriesSchema = z
  .object({
    categories: z.array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      })
    ),
  })
  .strict();
