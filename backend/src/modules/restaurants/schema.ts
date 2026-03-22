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
    fssai_license: z.string().max(100).optional().nullable(),
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
    outlet_id: z.string().uuid().optional(),
  })
  .strict();

export const updateHallSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    is_ac: z.boolean().optional(),
    outlet_id: z.string().uuid().optional(),
  })
  .strict();

export const createTableSchema = z
  .object({
    hall_id: z.string().uuid(),
    outlet_id: z.string().uuid().optional(),
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
    outlet_id: z.string().uuid().optional(),
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

export const reservationStatusSchema = z.enum([
  "BOOKED",
  "SEATED",
  "CANCELLED",
  "COMPLETED",
]);

export const createTableReservationSchema = z
  .object({
    table_id: z.string().uuid(),
    customer_name: z.string().min(1).max(120),
    customer_phone: z.string().min(7).max(30),
    customer_email: z.string().email().max(120).optional().nullable(),
    party_size: z.number().int().min(1).max(50),
    reserved_from: z.string().datetime(),
    reserved_to: z.string().datetime(),
    notes: z.string().max(500).optional().nullable(),
    status: reservationStatusSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const from = new Date(data.reserved_from);
    const to = new Date(data.reserved_to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid reservation datetime",
        path: ["reserved_from"],
      });
      return;
    }

    if (to <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reserved_to must be after reserved_from",
        path: ["reserved_to"],
      });
    }
  });

export const updateTableReservationSchema = z
  .object({
    table_id: z.string().uuid().optional(),
    customer_name: z.string().min(1).max(120).optional(),
    customer_phone: z.string().min(7).max(30).optional().nullable(),
    customer_email: z.string().email().max(120).optional().nullable(),
    party_size: z.number().int().min(1).max(50).optional(),
    reserved_from: z.string().datetime().optional(),
    reserved_to: z.string().datetime().optional(),
    notes: z.string().max(500).optional().nullable(),
    status: reservationStatusSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.reserved_from || !data.reserved_to) return;

    const from = new Date(data.reserved_from);
    const to = new Date(data.reserved_to);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid reservation datetime",
        path: ["reserved_from"],
      });
      return;
    }

    if (to <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reserved_to must be after reserved_from",
        path: ["reserved_to"],
      });
    }
  });

export const listTableReservationsQuerySchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    status: reservationStatusSchema.optional(),
    table_id: z.string().uuid().optional(),
  })
  .strict();

export const tableAvailabilityQuerySchema = z
  .object({
    start_at: z.string().datetime(),
    end_at: z.string().datetime(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const from = new Date(data.start_at);
    const to = new Date(data.end_at);
    if (to <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "end_at must be after start_at",
        path: ["end_at"],
      });
    }
  });

export const reservationAlertsQuerySchema = z
  .object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const from = new Date(data.from);
    const to = new Date(data.to);
    if (to <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "to must be after from",
        path: ["to"],
      });
    }
  });

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
