import { z } from 'zod';

export const createCustomerSchema = z
  .object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(500).optional(),
    credit_balance: z.coerce.number().optional(),
  })
  .strict();

export const updateCustomerSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
    email: z.string().email().optional(),
    notes: z.string().max(500).optional(),
    credit_balance: z.coerce.number().optional(),
  })
  .strict();

export const updateCustomerCreditSchema = z
  .object({
    amount: z.coerce.number(),
  })
  .strict();

export const updateCustomerTagsSchema = z
  .object({
    tags: z.array(z.string().min(1).max(50)).min(1).max(10),
  })
  .strict();

export const listCustomersQuerySchema = z.object({
  search: z.string().max(100).optional(),
  tags: z.string().optional(), // Comma-separated tags
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const customerAnalyticsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).default(90),
});

export const publicOrderHistorySchema = z
  .object({
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number format'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
  })
  .strict();