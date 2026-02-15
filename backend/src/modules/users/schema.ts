import { z } from 'zod';

export const createUserSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(['MANAGER', 'WAITER']),
  })
  .strict();

export const updateUserSchema = z
  .object({
    role: z.enum(['MANAGER', 'WAITER']),
  })
  .strict();
