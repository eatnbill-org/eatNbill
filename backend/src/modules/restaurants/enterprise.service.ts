import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { utils as xlsxUtils, write as writeXlsx } from 'xlsx';
import { AppError } from '../../middlewares/error.middleware';
import { prisma } from '../../utils/prisma';
import { createAuditLog } from './repository';
import * as repo from './enterprise.repository';

type LanguageCode = 'EN' | 'HI' | 'GU' | 'MR' | 'FR' | 'DE';
type ExportDataset =
  | 'ORDERS'
  | 'SALES'
  | 'USERS'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'RESERVATIONS'
  | 'DAY_END'
  | 'GST_INVOICES'
  | 'TAX_SUMMARY';
type ExportFormat = 'CSV' | 'XLSX';

type TaxLine = {
  order_item_id?: string;
  product_name: string;
  hsn_sac?: string | null;
  quantity: number;
  unit_price: number;
  taxable_amount: number;
  gst_rate_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax_amount: number;
  line_total_amount: number;
};

const EXPORT_BASE_DIR = path.resolve(process.cwd(), 'storage', 'exports');
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const AGGREGATOR_SOURCES = new Set(['ZOMATO', 'SWIGGY']);
const POLL_INTERVAL_MS = 4000;
const WORKER_BACKOFF_MS = 60_000;

let exportWorkerStarted = false;
let exportWorkerTimer: NodeJS.Timeout | null = null;
let exportWorkerPausedUntil = 0;

function round2(value: number) {
  return Number(Number(value).toFixed(2));
}

function toNum(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function parseBusinessDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Invalid business_date', 400);
  }
  return parsed;
}

function getBusinessWindow(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function sanitizeGstin(value?: string | null) {
  if (!value) return null;
  return value.trim().toUpperCase();
}

function inferStateCodeFromGstin(gstin?: string | null) {
  const normalized = sanitizeGstin(gstin);
  if (!normalized || normalized.length < 2) return null;
  return normalized.slice(0, 2);
}

function isValidGstin(gstin?: string | null) {
  const normalized = sanitizeGstin(gstin);
  if (!normalized) return false;
  return GSTIN_REGEX.test(normalized);
}

function encodeCsvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const stringified = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n]/.test(stringified)) {
    return `"${stringified.replace(/"/g, '""')}"`;
  }
  return stringified;
}

function rowsToCsv(rows: Record<string, unknown>[], selectedColumns?: string[]) {
  const headers =
    selectedColumns && selectedColumns.length
      ? selectedColumns
      : rows.length
        ? Object.keys(rows[0]!)
        : [];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((header) => encodeCsvCell(row[header]));
    lines.push(values.join(','));
  }
  return `${lines.join('\n')}\n`;
}

function rowsToXlsx(rows: Record<string, unknown>[], selectedColumns?: string[]) {
  const headers =
    selectedColumns && selectedColumns.length
      ? selectedColumns
      : rows.length
        ? Object.keys(rows[0]!)
        : [];

  const sheetRows = rows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const header of headers) {
      next[header] = row[header];
    }
    return next;
  });

  const worksheet = xlsxUtils.json_to_sheet(sheetRows, { header: headers, skipHeader: false });
  const workbook = xlsxUtils.book_new();
  xlsxUtils.book_append_sheet(workbook, worksheet, 'Export');
  return writeXlsx(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

function mapPaymentBucket(order: {
  source: string;
  payment_method: string | null;
  payment_amount: Prisma.Decimal | null;
  total_amount: Prisma.Decimal;
}) {
  const amount = order.payment_amount ? Number(order.payment_amount) : Number(order.total_amount);

  if (AGGREGATOR_SOURCES.has(order.source)) {
    return { bucket: 'aggregator' as const, amount };
  }

  const method = (order.payment_method || '').toUpperCase();
  if (method === 'CASH') return { bucket: 'cash' as const, amount };
  if (method === 'UPI' || method === 'GPAY') return { bucket: 'upi' as const, amount };
  return { bucket: 'card' as const, amount };
}

async function resolveOutletForContext(tenantId: string, restaurantId: string, outletId?: string | null) {
  if (outletId) {
    const outlet = await repo.getOutletById(restaurantId, outletId);
    if (!outlet) {
      throw new AppError('NOT_FOUND', 'Outlet not found', 404);
    }
    return outlet;
  }

  const ensured = await repo.ensureDefaultOutlet(tenantId, restaurantId);
  if (!ensured) {
    throw new AppError('NOT_FOUND', 'No outlet found for restaurant', 404);
  }
  return ensured;
}

async function assertOutletBelongsToRestaurant(restaurantId: string, outletId?: string | null) {
  if (!outletId) return;
  const outlet = await repo.getOutletById(restaurantId, outletId);
  if (!outlet) throw new AppError('NOT_FOUND', 'Outlet not found', 404);
}

function toSnakeKey(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();
}

function pickColumns(rows: Record<string, unknown>[], selectedColumns?: string[]) {
  if (!selectedColumns?.length) return rows;
  return rows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const key of selectedColumns) {
      next[key] = row[key];
    }
    return next;
  });
}

export async function listRestaurantOutlets(tenantId: string, restaurantId: string) {
  await repo.ensureDefaultOutlet(tenantId, restaurantId);
  return repo.listOutlets(restaurantId);
}

export async function addRestaurantOutlet(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    name: string;
    code?: string | null;
    address?: string | null;
    gstin?: string | null;
    state_code?: string | null;
    timezone?: string;
    default_language?: LanguageCode;
    receipt_template?: 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';
    variance_lock_amount?: number;
    variance_lock_percent?: number;
    tax_pricing_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';
    is_einvoice_enabled?: boolean;
    is_default?: boolean;
  }
) {
  const outlet = await repo.createOutlet({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    ...data,
    gstin: sanitizeGstin(data.gstin),
    state_code: data.state_code?.toUpperCase() ?? null,
  });

  await createAuditLog(tenantId, userId, 'CREATE', 'RESTAURANT_OUTLET', outlet.id, {
    name: outlet.name,
    code: outlet.code,
  });

  return outlet;
}

export async function editRestaurantOutlet(
  tenantId: string,
  userId: string,
  restaurantId: string,
  outletId: string,
  data: Partial<{
    name: string;
    code: string | null;
    address: string | null;
    gstin: string | null;
    state_code: string | null;
    timezone: string;
    default_language: LanguageCode;
    receipt_template: 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';
    variance_lock_amount: number;
    variance_lock_percent: number;
    tax_pricing_mode: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';
    is_einvoice_enabled: boolean;
    is_default: boolean;
  }>
) {
  const existing = await repo.getOutletById(restaurantId, outletId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Outlet not found', 404);
  }

  const outlet = await repo.updateOutlet(restaurantId, outletId, {
    ...data,
    ...(data.gstin !== undefined ? { gstin: sanitizeGstin(data.gstin) } : {}),
    ...(data.state_code !== undefined ? { state_code: data.state_code?.toUpperCase() ?? null } : {}),
  });

  await createAuditLog(tenantId, userId, 'UPDATE', 'RESTAURANT_OUTLET', outlet.id, {
    changes: data,
  });

  return outlet;
}

export async function getMyPreferences(
  tenantId: string,
  userId: string,
  restaurantId: string
) {
  const [prefs, defaultOutlet] = await Promise.all([
    repo.getUserPreference(userId),
    repo.getDefaultOutlet(restaurantId),
  ]);

  return {
    preferred_language: prefs?.preferred_language ?? null,
    default_outlet_id: prefs?.default_outlet_id ?? null,
    effective_language: (prefs?.preferred_language ?? defaultOutlet?.default_language ?? 'EN') as LanguageCode,
    effective_outlet_id: prefs?.default_outlet_id ?? defaultOutlet?.id ?? null,
  };
}

export async function updateMyPreferences(
  tenantId: string,
  userId: string,
  restaurantId: string,
  data: {
    preferred_language?: LanguageCode | null;
    default_outlet_id?: string | null;
  }
) {
  if (data.default_outlet_id) {
    await assertOutletBelongsToRestaurant(restaurantId, data.default_outlet_id);
  }

  const prefs = await repo.upsertUserPreference(userId, tenantId, data);
  await createAuditLog(tenantId, userId, 'UPDATE', 'USER_PREFERENCE', userId, data as Record<string, unknown>);
  return prefs;
}

export async function closeDayEnd(
  tenantId: string,
  userId: string,
  restaurantId: string,
  input: {
    outlet_id: string;
    business_date: string;
    actual_cash: number;
    actual_card: number;
    actual_upi: number;
    actual_aggregator: number;
    lock_reason?: string | null;
  }
) {
  const outlet = await repo.getOutletById(restaurantId, input.outlet_id);
  if (!outlet) throw new AppError('NOT_FOUND', 'Outlet not found', 404);

  const businessDate = parseBusinessDate(input.business_date);
  const { start, end } = getBusinessWindow(businessDate);
  const paidOrders = await repo.getOrdersForBusinessDate({
    tenantId,
    restaurantId,
    outletId: outlet.id,
    startAt: start,
    endAt: end,
  });

  const expected = {
    cash: 0,
    card: 0,
    upi: 0,
    aggregator: 0,
  };

  for (const order of paidOrders) {
    const mapped = mapPaymentBucket(order);
    expected[mapped.bucket] += mapped.amount;
  }

  const actual = {
    cash: round2(input.actual_cash),
    card: round2(input.actual_card),
    upi: round2(input.actual_upi),
    aggregator: round2(input.actual_aggregator),
  };

  const variance = {
    cash: round2(actual.cash - expected.cash),
    card: round2(actual.card - expected.card),
    upi: round2(actual.upi - expected.upi),
    aggregator: round2(actual.aggregator - expected.aggregator),
  };

  const expectedTotal = round2(expected.cash + expected.card + expected.upi + expected.aggregator);
  const actualTotal = round2(actual.cash + actual.card + actual.upi + actual.aggregator);
  const varianceTotal = round2(actualTotal - expectedTotal);
  const variancePercent = expectedTotal === 0 ? (actualTotal === 0 ? 0 : 100) : round2((varianceTotal / expectedTotal) * 100);

  const varianceAmountThreshold = toNum(outlet.variance_lock_amount);
  const variancePercentThreshold = toNum(outlet.variance_lock_percent);
  const lockByAmount = varianceAmountThreshold > 0 && Math.abs(varianceTotal) > varianceAmountThreshold;
  const lockByPercent = variancePercentThreshold > 0 && Math.abs(variancePercent) > variancePercentThreshold;
  const status: 'CLOSED' | 'LOCKED' = lockByAmount || lockByPercent ? 'LOCKED' : 'CLOSED';

  const closure = await repo.upsertDayEndClosure({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    outlet_id: outlet.id,
    business_date: businessDate,
    expected_cash: round2(expected.cash),
    expected_card: round2(expected.card),
    expected_upi: round2(expected.upi),
    expected_aggregator: round2(expected.aggregator),
    actual_cash: actual.cash,
    actual_card: actual.card,
    actual_upi: actual.upi,
    actual_aggregator: actual.aggregator,
    variance_cash: variance.cash,
    variance_card: variance.card,
    variance_upi: variance.upi,
    variance_aggregator: variance.aggregator,
    expected_total: expectedTotal,
    actual_total: actualTotal,
    variance_total: varianceTotal,
    variance_percent: variancePercent,
    status,
    closed_by_user_id: userId,
    closed_at: new Date(),
    locked_at: status === 'LOCKED' ? new Date() : null,
    lock_reason: status === 'LOCKED' ? input.lock_reason ?? 'Variance threshold exceeded' : null,
  });

  await repo.createDayEndVarianceEvent({
    day_end_id: closure.id,
    event_type: status === 'LOCKED' ? 'LOCKED' : 'CLOSED',
    created_by_user_id: userId,
    metadata: {
      expected,
      actual,
      variance,
      expected_total: expectedTotal,
      actual_total: actualTotal,
      variance_total: varianceTotal,
      variance_percent: variancePercent,
      threshold_amount: varianceAmountThreshold,
      threshold_percent: variancePercentThreshold,
    } as Prisma.InputJsonValue,
  });

  await createAuditLog(tenantId, userId, 'CLOSE', 'DAY_END', closure.id, {
    outlet_id: outlet.id,
    business_date: input.business_date,
    status,
    variance_total: varianceTotal,
  });

  return closure;
}

export async function getDayEndList(
  restaurantId: string,
  query: {
    outlet_id?: string;
    from?: string;
    to?: string;
    status?: 'OPEN' | 'CLOSED' | 'LOCKED';
  }
) {
  return repo.listDayEnds({
    restaurantId,
    outletId: query.outlet_id,
    from: query.from ? parseBusinessDate(query.from) : undefined,
    to: query.to ? parseBusinessDate(query.to) : undefined,
    status: query.status,
  });
}

export async function getDayEndDetails(restaurantId: string, dayEndId: string) {
  const closure = await repo.getDayEndById(restaurantId, dayEndId);
  if (!closure) throw new AppError('NOT_FOUND', 'Day-end closure not found', 404);
  return closure;
}

export async function unlockDayEndClosure(
  tenantId: string,
  userId: string,
  restaurantId: string,
  dayEndId: string,
  reason: string
) {
  const closure = await repo.getDayEndById(restaurantId, dayEndId);
  if (!closure) throw new AppError('NOT_FOUND', 'Day-end closure not found', 404);
  if (closure.status !== 'LOCKED') {
    throw new AppError('VALIDATION_ERROR', 'Day-end is not locked', 400);
  }

  const updated = await repo.unlockDayEnd({
    day_end_id: dayEndId,
    reason,
    unlocked_by_user_id: userId,
  });

  await createAuditLog(tenantId, userId, 'UNLOCK', 'DAY_END', dayEndId, { reason });
  return updated;
}

export async function assertFinanceMutationAllowed(params: {
  outletId?: string | null;
  businessDate: Date;
}) {
  if (!params.outletId) return;

  const locked = await repo.findLockedDayEnd({
    outletId: params.outletId,
    businessDate: parseBusinessDate(params.businessDate.toISOString().slice(0, 10)),
  });
  if (locked) {
    throw new AppError(
      'CONFLICT',
      `Day-end is locked for ${locked.business_date.toISOString().slice(0, 10)}. Unlock before financial mutation.`,
      409
    );
  }
}

export async function createExportJob(
  tenantId: string,
  userId: string,
  restaurantId: string,
  input: {
    dataset: ExportDataset;
    format: ExportFormat;
    outlet_id?: string | null;
    filters?: Record<string, unknown>;
    selected_columns?: string[];
  }
) {
  if (input.outlet_id) {
    await assertOutletBelongsToRestaurant(restaurantId, input.outlet_id);
  }

  const job = await repo.createExportJob({
    tenant_id: tenantId,
    restaurant_id: restaurantId,
    outlet_id: input.outlet_id ?? null,
    user_id: userId,
    dataset: input.dataset,
    format: input.format,
    filters: (input.filters ?? {}) as Prisma.InputJsonValue,
    selected_columns: input.selected_columns ?? [],
  });

  await createAuditLog(tenantId, userId, 'CREATE', 'EXPORT_JOB', job.id, {
    dataset: input.dataset,
    format: input.format,
  });

  return job;
}

export async function listExportJobs(
  restaurantId: string,
  query: {
    status?: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
    dataset?: ExportDataset;
    outlet_id?: string;
  }
) {
  return repo.listExportJobs({
    restaurantId,
    status: query.status,
    dataset: query.dataset,
    outletId: query.outlet_id,
  });
}

export async function getExportJob(restaurantId: string, jobId: string) {
  const job = await repo.getExportJobById(restaurantId, jobId);
  if (!job) throw new AppError('NOT_FOUND', 'Export job not found', 404);
  return job;
}

export function resolveExportStoragePath(storagePath: string) {
  return path.resolve(EXPORT_BASE_DIR, storagePath);
}

async function getRowsForDataset(job: Awaited<ReturnType<typeof repo.claimNextExportJob>>) {
  const filters = (job?.filters as Record<string, unknown> | null) ?? {};
  const from = typeof filters.from === 'string' ? new Date(filters.from) : null;
  const to = typeof filters.to === 'string' ? new Date(filters.to) : null;
  const outletId = (typeof filters.outlet_id === 'string' ? filters.outlet_id : job?.outlet_id) ?? undefined;

  if (!job) return [];

  if (job.dataset === 'ORDERS') {
    const orders = await prisma.order.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              placed_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { outlet: true },
      orderBy: { placed_at: 'desc' },
    });
    return orders.map((order) => ({
      order_id: order.id,
      order_number: order.order_number,
      outlet_name: order.outlet?.name ?? '',
      source: order.source,
      order_type: order.order_type,
      status: order.status,
      payment_method: order.payment_method ?? '',
      payment_status: order.payment_status,
      total_amount: Number(order.total_amount),
      placed_at: order.placed_at.toISOString(),
      paid_at: order.paid_at?.toISOString() ?? '',
    }));
  }

  if (job.dataset === 'SALES') {
    const orders = await prisma.order.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        payment_status: 'PAID',
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              paid_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { outlet: true },
      orderBy: { paid_at: 'desc' },
    });
    return orders.map((order) => ({
      order_id: order.id,
      order_number: order.order_number,
      outlet_name: order.outlet?.name ?? '',
      source: order.source,
      payment_method: order.payment_method ?? '',
      total_amount: Number(order.total_amount),
      payment_amount: Number(order.payment_amount ?? order.total_amount),
      paid_at: order.paid_at?.toISOString() ?? '',
    }));
  }

  if (job.dataset === 'USERS') {
    const users = await prisma.restaurantUser.findMany({
      where: { restaurant_id: job.restaurant_id },
      include: { user: true },
      orderBy: { created_at: 'desc' },
    });
    return users.map((staff) => ({
      restaurant_user_id: staff.id,
      role: staff.role,
      is_active: staff.is_active,
      email: staff.user?.email ?? staff.email ?? '',
      phone: staff.user?.phone ?? staff.phone ?? '',
      created_at: staff.created_at.toISOString(),
    }));
  }

  if (job.dataset === 'CUSTOMERS') {
    const customers = await prisma.customer.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...((from || to)
          ? {
              created_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
    });
    return customers.map((customer) => ({
      customer_id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? '',
      tags: customer.tags.join('|'),
      credit_balance: Number(customer.credit_balance),
      created_at: customer.created_at.toISOString(),
    }));
  }

  if (job.dataset === 'PRODUCTS') {
    const products = await prisma.product.findMany({
      where: { restaurant_id: job.restaurant_id, deleted_at: null },
      include: { category: true },
      orderBy: { created_at: 'desc' },
    });
    return products.map((product) => ({
      product_id: product.id,
      name: product.name,
      category: product.category?.name ?? '',
      price: Number(product.price),
      cost_price: Number(product.costprice ?? 0),
      discount_percent: Number(product.discount_percent ?? 0),
      hsn_sac: product.hsn_sac ?? '',
      gst_rate_percent: Number(product.gst_rate_percent ?? 0),
      is_active: product.is_active,
      created_at: product.created_at.toISOString(),
    }));
  }

  if (job.dataset === 'RESERVATIONS') {
    const reservations = await prisma.tableReservation.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              reserved_from: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { table: true, outlet: true },
      orderBy: { reserved_from: 'desc' },
    });
    return reservations.map((reservation) => ({
      reservation_id: reservation.id,
      outlet_name: reservation.outlet?.name ?? '',
      table_number: reservation.table?.table_number ?? '',
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone ?? '',
      customer_email: reservation.customer_email ?? '',
      party_size: reservation.party_size,
      status: reservation.status,
      reserved_from: reservation.reserved_from.toISOString(),
      reserved_to: reservation.reserved_to.toISOString(),
    }));
  }

  if (job.dataset === 'DAY_END') {
    const rows = await prisma.dayEndClosure.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              business_date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { outlet: true },
      orderBy: { business_date: 'desc' },
    });
    return rows.map((row) => ({
      day_end_id: row.id,
      outlet_name: row.outlet.name,
      business_date: row.business_date.toISOString().slice(0, 10),
      status: row.status,
      expected_total: Number(row.expected_total),
      actual_total: Number(row.actual_total),
      variance_total: Number(row.variance_total),
      variance_percent: Number(row.variance_percent),
      closed_at: row.closed_at?.toISOString() ?? '',
      locked_at: row.locked_at?.toISOString() ?? '',
    }));
  }

  if (job.dataset === 'GST_INVOICES') {
    const invoices = await prisma.gstInvoice.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              created_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { outlet: true, order: true },
      orderBy: { created_at: 'desc' },
    });
    return invoices.map((invoice) => ({
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      order_number: invoice.order.order_number,
      outlet_name: invoice.outlet.name,
      invoice_type: invoice.invoice_type,
      status: invoice.status,
      irn_status: invoice.irn_status,
      buyer_gstin: invoice.buyer_gstin ?? '',
      seller_gstin: invoice.seller_gstin ?? '',
      taxable_amount: Number(invoice.taxable_amount),
      total_tax_amount: Number(invoice.total_tax_amount),
      grand_total_amount: Number(invoice.grand_total_amount),
      created_at: invoice.created_at.toISOString(),
    }));
  }

  if (job.dataset === 'TAX_SUMMARY') {
    const invoices = await prisma.gstInvoice.findMany({
      where: {
        restaurant_id: job.restaurant_id,
        ...(outletId ? { outlet_id: outletId } : {}),
        ...((from || to)
          ? {
              created_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { outlet: true },
      orderBy: { created_at: 'asc' },
    });

    const grouped = new Map<string, {
      date: string;
      outlet_name: string;
      taxable_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      igst_amount: number;
      total_tax_amount: number;
      grand_total_amount: number;
      invoice_count: number;
    }>();

    for (const invoice of invoices) {
      const date = invoice.created_at.toISOString().slice(0, 10);
      const key = `${date}:${invoice.outlet_id}`;
      const current = grouped.get(key) ?? {
        date,
        outlet_name: invoice.outlet.name,
        taxable_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_tax_amount: 0,
        grand_total_amount: 0,
        invoice_count: 0,
      };
      current.taxable_amount += Number(invoice.taxable_amount);
      current.cgst_amount += Number(invoice.cgst_amount);
      current.sgst_amount += Number(invoice.sgst_amount);
      current.igst_amount += Number(invoice.igst_amount);
      current.total_tax_amount += Number(invoice.total_tax_amount);
      current.grand_total_amount += Number(invoice.grand_total_amount);
      current.invoice_count += 1;
      grouped.set(key, current);
    }

    return Array.from(grouped.values()).map((item) => ({
      ...item,
      taxable_amount: round2(item.taxable_amount),
      cgst_amount: round2(item.cgst_amount),
      sgst_amount: round2(item.sgst_amount),
      igst_amount: round2(item.igst_amount),
      total_tax_amount: round2(item.total_tax_amount),
      grand_total_amount: round2(item.grand_total_amount),
    }));
  }

  return [];
}

async function processOneExportJob() {
  const job = await repo.claimNextExportJob();
  if (!job) return;

  try {
    const rawRows = await getRowsForDataset(job);
    const rows = pickColumns(rawRows, job.selected_columns);
    const ext = job.format === 'XLSX' ? 'xlsx' : 'csv';
    const contentType =
      job.format === 'XLSX'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    const fileName = `${toSnakeKey(job.dataset)}_${job.id}.${ext}`;
    const relativeDir = path.join(job.id);
    const absoluteDir = path.resolve(EXPORT_BASE_DIR, relativeDir);
    const relativePath = path.join(relativeDir, fileName);
    const absolutePath = path.resolve(EXPORT_BASE_DIR, relativePath);

    await fs.mkdir(absoluteDir, { recursive: true });
    if (job.format === 'XLSX') {
      const xlsx = rowsToXlsx(rows, job.selected_columns);
      await fs.writeFile(absolutePath, xlsx);
    } else {
      const csv = rowsToCsv(rows, job.selected_columns);
      await fs.writeFile(absolutePath, csv, 'utf8');
    }
    const stats = await fs.stat(absolutePath);

    await repo.completeExportJob({
      jobId: job.id,
      fileName,
      mimeType: contentType,
      storagePath: relativePath,
      sizeBytes: Number(stats.size),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export processing failed';
    await repo.failExportJob(job.id, message);
  }
}

export function startExportWorker() {
  if (exportWorkerStarted) return;
  exportWorkerStarted = true;

  exportWorkerTimer = setInterval(() => {
    const now = Date.now();
    if (now < exportWorkerPausedUntil) return;

    void processOneExportJob().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (/does not exist/i.test(message) || /P2021/.test(message)) {
        exportWorkerPausedUntil = Date.now() + WORKER_BACKOFF_MS;
        console.warn(
          '[export-worker] paused for 60s because export tables are not ready. Apply migrations and worker will auto-resume.'
        );
        return;
      }
      console.error('[export-worker] unexpected error:', error);
    });
  }, POLL_INTERVAL_MS);
}

export function stopExportWorker() {
  if (exportWorkerTimer) {
    clearInterval(exportWorkerTimer);
    exportWorkerTimer = null;
  }
  exportWorkerStarted = false;
}

type InvoiceValidationResult = {
  errors: string[];
  warnings: string[];
  invoice_type: 'B2B' | 'B2C';
  seller_gstin: string | null;
  seller_state_code: string | null;
  buyer_gstin: string | null;
  buyer_state_code: string | null;
  is_tax_inclusive: boolean;
  lines: TaxLine[];
  totals: {
    subtotal_amount: number;
    discount_amount: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_tax_amount: number;
    grand_total_amount: number;
  };
};

function computeInvoiceTax(
  order: Awaited<ReturnType<typeof repo.getOrderForInvoice>>,
  input: { buyer_name?: string | null; buyer_gstin?: string | null; buyer_state_code?: string | null }
): InvoiceValidationResult {
  if (!order || !order.outlet) {
    throw new AppError('NOT_FOUND', 'Order or outlet not found for invoice', 404);
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const buyerGstin = sanitizeGstin(input.buyer_gstin);
  const buyerStateCode = input.buyer_state_code?.trim() || inferStateCodeFromGstin(buyerGstin);
  const sellerGstin = sanitizeGstin(order.outlet.gstin);
  const sellerStateCode = order.outlet.state_code?.trim() || inferStateCodeFromGstin(sellerGstin);
  const invoiceType: 'B2B' | 'B2C' = buyerGstin ? 'B2B' : 'B2C';
  const isTaxInclusive = order.outlet.tax_pricing_mode === 'TAX_INCLUSIVE';

  if (!sellerGstin) {
    errors.push('Seller GSTIN is missing in outlet settings');
  } else if (!isValidGstin(sellerGstin)) {
    errors.push('Seller GSTIN format is invalid');
  }

  if (buyerGstin && !isValidGstin(buyerGstin)) {
    errors.push('Buyer GSTIN format is invalid');
  }

  if (invoiceType === 'B2B' && !buyerGstin) {
    errors.push('Buyer GSTIN is required for B2B invoice');
  }

  const isIntraState = Boolean(sellerStateCode && buyerStateCode ? sellerStateCode === buyerStateCode : true);

  const lines: TaxLine[] = [];
  let subtotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTax = 0;

  for (const item of order.items) {
    const qty = item.quantity;
    const unitPrice = Number(item.price_snapshot);
    const lineBase = round2(unitPrice * qty);
    const rate = round2(
      Number(item.gst_rate_snapshot ?? item.product?.gst_rate_percent ?? 0)
    );
    const hsn = item.hsn_sac_snapshot ?? item.product?.hsn_sac ?? null;

    if (!hsn) {
      errors.push(`HSN/SAC missing for item ${item.name_snapshot}`);
    }

    let taxable = lineBase;
    let lineTax = 0;
    if (rate > 0) {
      if (isTaxInclusive) {
        taxable = round2(lineBase / (1 + rate / 100));
        lineTax = round2(lineBase - taxable);
      } else {
        taxable = lineBase;
        lineTax = round2((taxable * rate) / 100);
      }
    }

    const cgst = isIntraState ? round2(lineTax / 2) : 0;
    const sgst = isIntraState ? round2(lineTax / 2) : 0;
    const igst = isIntraState ? 0 : lineTax;
    const lineTotal = isTaxInclusive ? lineBase : round2(taxable + lineTax);

    subtotal += lineBase;
    taxableTotal += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;
    totalTax += lineTax;

    lines.push({
      order_item_id: item.id,
      product_name: item.name_snapshot,
      hsn_sac: hsn,
      quantity: qty,
      unit_price: unitPrice,
      taxable_amount: taxable,
      gst_rate_percent: rate,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_tax_amount: lineTax,
      line_total_amount: lineTotal,
    });
  }

  const discount = round2(Number(order.discount_amount ?? 0));
  const grandTotal = isTaxInclusive
    ? round2(subtotal - discount)
    : round2(subtotal + totalTax - discount);
  const orderTotal = round2(Number(order.total_amount));
  if (Math.abs(orderTotal - grandTotal) > 1.5) {
    warnings.push('Invoice computed total differs from order total');
  }

  return {
    errors,
    warnings,
    invoice_type: invoiceType,
    seller_gstin: sellerGstin,
    seller_state_code: sellerStateCode ?? null,
    buyer_gstin: buyerGstin,
    buyer_state_code: buyerStateCode ?? null,
    is_tax_inclusive: isTaxInclusive,
    lines,
    totals: {
      subtotal_amount: round2(subtotal),
      discount_amount: discount,
      taxable_amount: round2(taxableTotal),
      cgst_amount: round2(cgstTotal),
      sgst_amount: round2(sgstTotal),
      igst_amount: round2(igstTotal),
      total_tax_amount: round2(totalTax),
      grand_total_amount: grandTotal,
    },
  };
}

async function upsertInvoiceFromValidation(params: {
  tenantId: string;
  restaurantId: string;
  order: NonNullable<Awaited<ReturnType<typeof repo.getOrderForInvoice>>>;
  buyer_name?: string | null;
  buyer_gstin?: string | null;
  buyer_state_code?: string | null;
}) {
  const validation = computeInvoiceTax(params.order, {
    buyer_name: params.buyer_name,
    buyer_gstin: params.buyer_gstin,
    buyer_state_code: params.buyer_state_code,
  });

  const existing = await repo.findInvoiceByOrder(params.order.id);
  const irnStatus: 'NOT_APPLICABLE' | 'READY' =
    params.order.outlet?.is_einvoice_enabled && validation.invoice_type === 'B2B' && validation.errors.length === 0
      ? 'READY'
      : 'NOT_APPLICABLE';

  if (existing) {
    await repo.updateInvoiceForValidation(existing.id, {
      buyer_name: params.buyer_name ?? null,
      buyer_gstin: validation.buyer_gstin,
      buyer_state_code: validation.buyer_state_code,
      invoice_type: validation.invoice_type,
      status: 'DRAFT',
      irn_status: irnStatus,
      is_tax_inclusive: validation.is_tax_inclusive,
      ...validation.totals,
      lines: validation.lines,
    });
    const updated = await repo.findInvoiceByOrder(params.order.id);
    return { invoice: updated, validation };
  }

  const outlet = await resolveOutletForContext(params.tenantId, params.restaurantId, params.order.outlet_id);
  const series = await repo.getOrCreateInvoiceSeries({
    tenantId: params.tenantId,
    restaurantId: params.restaurantId,
    outletId: outlet.id,
    referenceDate: params.order.placed_at,
  });
  const reserved = await repo.reserveNextInvoiceNumber(series.id);

  const created = await repo.createInvoiceWithLines({
    tenant_id: params.tenantId,
    restaurant_id: params.restaurantId,
    outlet_id: outlet.id,
    order_id: params.order.id,
    series_id: series.id,
    invoice_number: reserved.invoiceNumber,
    invoice_type: validation.invoice_type,
    buyer_name: params.buyer_name ?? null,
    buyer_gstin: validation.buyer_gstin,
    buyer_state_code: validation.buyer_state_code,
    seller_gstin: validation.seller_gstin,
    seller_state_code: validation.seller_state_code,
    is_tax_inclusive: validation.is_tax_inclusive,
    ...validation.totals,
    status: 'DRAFT',
    irn_status: irnStatus,
    lines: validation.lines,
  });

  return { invoice: created, validation };
}

export async function validateGstInvoice(
  tenantId: string,
  restaurantId: string,
  orderId: string,
  input: {
    buyer_name?: string | null;
    buyer_gstin?: string | null;
    buyer_state_code?: string | null;
  }
) {
  const order = await repo.getOrderForInvoice(tenantId, restaurantId, orderId);
  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }

  const { invoice, validation } = await upsertInvoiceFromValidation({
    tenantId,
    restaurantId,
    order,
    ...input,
  });

  return {
    invoice,
    validation,
  };
}

export async function getGstInvoice(
  tenantId: string,
  restaurantId: string,
  orderId: string
) {
  const existing = await repo.findInvoiceByOrder(orderId);
  if (existing) return existing;

  const order = await repo.getOrderForInvoice(tenantId, restaurantId, orderId);
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);

  const { invoice } = await upsertInvoiceFromValidation({
    tenantId,
    restaurantId,
    order,
    buyer_name: null,
    buyer_gstin: null,
    buyer_state_code: null,
  });
  return invoice;
}

type EInvoiceProviderResult = {
  success: boolean;
  irn?: string;
  ack_no?: string;
  ack_date?: Date;
  signed_qr_payload?: string;
  error?: Record<string, unknown>;
};

interface EInvoiceProvider {
  name: string;
  submit(invoice: NonNullable<Awaited<ReturnType<typeof repo.findInvoiceByOrder>>>): Promise<EInvoiceProviderResult>;
}

const mockProvider: EInvoiceProvider = {
  name: 'mock',
  async submit(invoice) {
    const seed = `${invoice.id}:${invoice.invoice_number}:${Date.now()}`;
    const hash = createHash('sha256').update(seed).digest('hex').toUpperCase();
    return {
      success: true,
      irn: hash.slice(0, 64),
      ack_no: hash.slice(0, 16),
      ack_date: new Date(),
      signed_qr_payload: `MOCK_QR:${invoice.invoice_number}:${hash.slice(0, 24)}`,
    };
  },
};

const sandboxHookProvider: EInvoiceProvider = {
  name: 'sandbox_hook',
  async submit(invoice) {
    const target = process.env.EINVOICE_SANDBOX_URL;
    if (!target) {
      return {
        success: false,
        error: { code: 'SANDBOX_URL_MISSING', message: 'EINVOICE_SANDBOX_URL is not configured' },
      };
    }

    const response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        invoice_number: invoice.invoice_number,
        invoice_id: invoice.id,
        order_id: invoice.order_id,
        amount: Number(invoice.grand_total_amount),
        buyer_gstin: invoice.buyer_gstin,
        seller_gstin: invoice.seller_gstin,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'SANDBOX_HTTP_ERROR',
          status: response.status,
          message: `Sandbox response ${response.status}`,
        },
      };
    }

    const json = (await response.json()) as {
      success?: boolean;
      irn?: string;
      ack_no?: string;
      ack_date?: string;
      signed_qr_payload?: string;
      error?: Record<string, unknown>;
    };

    if (!json.success) {
      return { success: false, error: json.error ?? { code: 'SANDBOX_FAILED' } };
    }

    return {
      success: true,
      irn: json.irn,
      ack_no: json.ack_no,
      ack_date: json.ack_date ? new Date(json.ack_date) : new Date(),
      signed_qr_payload: json.signed_qr_payload,
    };
  },
};

function getEInvoiceProvider(name?: string) {
  if (!name || name === 'mock') return mockProvider;
  if (name === 'sandbox_hook') return sandboxHookProvider;
  throw new AppError('VALIDATION_ERROR', `Unsupported e-invoice provider: ${name}`, 400);
}

export async function generateEInvoice(
  tenantId: string,
  restaurantId: string,
  orderId: string,
  providerName?: string
) {
  const invoice = await getGstInvoice(tenantId, restaurantId, orderId);
  if (!invoice) throw new AppError('NOT_FOUND', 'Invoice not found', 404);

  if (invoice.irn_status === 'SUCCESS') {
    return invoice;
  }

  if (invoice.irn_status === 'NOT_APPLICABLE') {
    throw new AppError(
      'VALIDATION_ERROR',
      'E-invoice generation is not applicable. Ensure outlet is eligible and invoice is B2B with valid GSTIN.',
      400
    );
  }

  const provider = getEInvoiceProvider(providerName);
  await repo.updateEInvoiceResult({
    invoiceId: invoice.id,
    status: 'SUBMITTED',
    provider: provider.name,
    einvoice_error: null,
  });

  const latest = await repo.findInvoiceByOrder(orderId);
  if (!latest) throw new AppError('NOT_FOUND', 'Invoice not found', 404);

  const result = await provider.submit(latest);
  if (!result.success) {
    await repo.updateEInvoiceResult({
      invoiceId: latest.id,
      status: 'FAILED',
      provider: provider.name,
      einvoice_error: (result.error ?? { code: 'UNKNOWN' }) as Prisma.InputJsonValue,
    });
  } else {
    await repo.updateEInvoiceResult({
      invoiceId: latest.id,
      status: 'SUCCESS',
      provider: provider.name,
      irn: result.irn ?? null,
      ack_no: result.ack_no ?? null,
      ack_date: result.ack_date ?? null,
      signed_qr_payload: result.signed_qr_payload ?? null,
      einvoice_error: null,
    });
  }

  const updated = await repo.findInvoiceByOrder(orderId);
  if (!updated) throw new AppError('NOT_FOUND', 'Invoice not found', 404);
  return updated;
}

export async function inferOutletIdForRestaurant(tenantId: string, restaurantId: string, preferredOutletId?: string | null) {
  const outlet = await resolveOutletForContext(tenantId, restaurantId, preferredOutletId);
  return outlet.id;
}
