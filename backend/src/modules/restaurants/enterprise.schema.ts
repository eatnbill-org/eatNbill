import { z } from 'zod';

export const languageCodeSchema = z.enum(['EN', 'HI', 'GU', 'MR', 'FR', 'DE']);
export const receiptTemplateSchema = z.enum(['MM80_STANDARD', 'MM58_COMPACT', 'A4_TAX_INVOICE']);
export const taxPricingModeSchema = z.enum(['TAX_INCLUSIVE', 'TAX_EXCLUSIVE']);

export const createOutletSchema = z
  .object({
    name: z.string().min(2).max(120),
    code: z.string().max(40).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    gstin: z.string().max(20).optional().nullable(),
    state_code: z.string().max(5).optional().nullable(),
    timezone: z.string().max(64).optional(),
    default_language: languageCodeSchema.optional(),
    receipt_template: receiptTemplateSchema.optional(),
    variance_lock_amount: z.number().min(0).max(9999999).optional(),
    variance_lock_percent: z.number().min(0).max(100).optional(),
    tax_pricing_mode: taxPricingModeSchema.optional(),
    is_einvoice_enabled: z.boolean().optional(),
    is_default: z.boolean().optional(),
  })
  .strict();

export const updateOutletSchema = createOutletSchema.partial().strict();

export const updateMyPreferencesSchema = z
  .object({
    preferred_language: languageCodeSchema.nullable().optional(),
    default_outlet_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const closeDayEndSchema = z
  .object({
    outlet_id: z.string().uuid(),
    business_date: z.string().date(),
    actual_cash: z.number().min(0),
    actual_card: z.number().min(0),
    actual_upi: z.number().min(0),
    actual_aggregator: z.number().min(0),
    lock_reason: z.string().max(500).optional().nullable(),
  })
  .strict();

export const listDayEndQuerySchema = z
  .object({
    outlet_id: z.string().uuid().optional(),
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    status: z.enum(['OPEN', 'CLOSED', 'LOCKED']).optional(),
  })
  .strict();

export const unlockDayEndSchema = z
  .object({
    reason: z.string().min(3).max(500),
  })
  .strict();

export const exportDatasetSchema = z.enum([
  'ORDERS',
  'SALES',
  'USERS',
  'CUSTOMERS',
  'PRODUCTS',
  'RESERVATIONS',
  'DAY_END',
  'GST_INVOICES',
  'TAX_SUMMARY',
]);

export const exportFormatSchema = z.enum(['CSV', 'XLSX']);

export const createExportJobSchema = z
  .object({
    dataset: exportDatasetSchema,
    format: exportFormatSchema,
    outlet_id: z.string().uuid().optional().nullable(),
    filters: z.record(z.string(), z.any()).optional(),
    selected_columns: z.array(z.string()).max(200).optional(),
  })
  .strict();

export const listExportJobsQuerySchema = z
  .object({
    status: z.enum(['QUEUED', 'RUNNING', 'DONE', 'FAILED']).optional(),
    dataset: exportDatasetSchema.optional(),
    outlet_id: z.string().uuid().optional(),
  })
  .strict();

export const invoiceQuerySchema = z
  .object({
    buyer_name: z.string().max(150).optional().nullable(),
    buyer_gstin: z.string().max(20).optional().nullable(),
    buyer_state_code: z.string().max(5).optional().nullable(),
  })
  .strict();

export const generateEInvoiceSchema = z
  .object({
    provider: z.string().max(50).optional(),
  })
  .strict();
