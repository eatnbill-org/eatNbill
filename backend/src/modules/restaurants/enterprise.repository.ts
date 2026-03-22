import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma';

export async function getDefaultOutlet(restaurantId: string) {
  return prisma.restaurantOutlet.findFirst({
    where: { restaurant_id: restaurantId, is_default: true },
    orderBy: { created_at: 'asc' },
  });
}

export async function ensureDefaultOutlet(tenantId: string, restaurantId: string) {
  const existing = await getDefaultOutlet(restaurantId);
  if (existing) return existing;

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, tenant_id: true, address: true, gst_number: true },
  });
  if (!restaurant) return null;

  return prisma.restaurantOutlet.create({
    data: {
      tenant_id: tenantId || restaurant.tenant_id,
      restaurant_id: restaurant.id,
      name: 'Main Outlet',
      code: 'MAIN',
      address: restaurant.address,
      gstin: restaurant.gst_number,
      is_default: true,
    },
  });
}

export async function listOutlets(restaurantId: string) {
  return prisma.restaurantOutlet.findMany({
    where: { restaurant_id: restaurantId },
    orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
  });
}

export async function createOutlet(data: {
  tenant_id: string;
  restaurant_id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  gstin?: string | null;
  state_code?: string | null;
  timezone?: string;
  default_language?: 'EN' | 'HI' | 'GU' | 'MR' | 'FR' | 'DE';
  receipt_template?: 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';
  variance_lock_amount?: number;
  variance_lock_percent?: number;
  tax_pricing_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';
  is_einvoice_enabled?: boolean;
  is_default?: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    if (data.is_default) {
      await tx.restaurantOutlet.updateMany({
        where: { restaurant_id: data.restaurant_id, is_default: true },
        data: { is_default: false },
      });
    }

    return tx.restaurantOutlet.create({
      data: {
        tenant_id: data.tenant_id,
        restaurant_id: data.restaurant_id,
        name: data.name,
        code: data.code ?? null,
        address: data.address ?? null,
        gstin: data.gstin ?? null,
        state_code: data.state_code ?? null,
        timezone: data.timezone ?? 'Asia/Kolkata',
        default_language: data.default_language ?? 'EN',
        receipt_template: data.receipt_template ?? 'MM80_STANDARD',
        variance_lock_amount: data.variance_lock_amount ?? 0,
        variance_lock_percent: data.variance_lock_percent ?? 0,
        tax_pricing_mode: data.tax_pricing_mode ?? 'TAX_INCLUSIVE',
        is_einvoice_enabled: data.is_einvoice_enabled ?? false,
        is_default: data.is_default ?? false,
      },
    });
  });
}

export async function getOutletById(restaurantId: string, outletId: string) {
  return prisma.restaurantOutlet.findFirst({
    where: { id: outletId, restaurant_id: restaurantId },
  });
}

export async function updateOutlet(
  restaurantId: string,
  outletId: string,
  data: Partial<{
    name: string;
    code: string | null;
    address: string | null;
    gstin: string | null;
    state_code: string | null;
    timezone: string;
    default_language: 'EN' | 'HI' | 'GU' | 'MR' | 'FR' | 'DE';
    receipt_template: 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';
    variance_lock_amount: number;
    variance_lock_percent: number;
    tax_pricing_mode: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';
    is_einvoice_enabled: boolean;
    is_default: boolean;
  }>
) {
  return prisma.$transaction(async (tx) => {
    if (data.is_default) {
      await tx.restaurantOutlet.updateMany({
        where: { restaurant_id: restaurantId, is_default: true, id: { not: outletId } },
        data: { is_default: false },
      });
    }

    return tx.restaurantOutlet.update({
      where: { id: outletId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.gstin !== undefined ? { gstin: data.gstin } : {}),
        ...(data.state_code !== undefined ? { state_code: data.state_code } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
        ...(data.default_language !== undefined ? { default_language: data.default_language } : {}),
        ...(data.receipt_template !== undefined ? { receipt_template: data.receipt_template } : {}),
        ...(data.variance_lock_amount !== undefined ? { variance_lock_amount: data.variance_lock_amount } : {}),
        ...(data.variance_lock_percent !== undefined ? { variance_lock_percent: data.variance_lock_percent } : {}),
        ...(data.tax_pricing_mode !== undefined ? { tax_pricing_mode: data.tax_pricing_mode } : {}),
        ...(data.is_einvoice_enabled !== undefined ? { is_einvoice_enabled: data.is_einvoice_enabled } : {}),
        ...(data.is_default !== undefined ? { is_default: data.is_default } : {}),
      },
    });
  });
}

export async function getUserPreference(userId: string) {
  return prisma.userPreference.findUnique({
    where: { user_id: userId },
  });
}

export async function upsertUserPreference(
  userId: string,
  tenantId: string,
  data: {
    preferred_language?: 'EN' | 'HI' | 'GU' | 'MR' | 'FR' | 'DE' | null;
    default_outlet_id?: string | null;
  }
) {
  return prisma.userPreference.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      tenant_id: tenantId,
      preferred_language: data.preferred_language ?? null,
      default_outlet_id: data.default_outlet_id ?? null,
    },
    update: {
      preferred_language: data.preferred_language !== undefined ? data.preferred_language : undefined,
      default_outlet_id: data.default_outlet_id !== undefined ? data.default_outlet_id : undefined,
    },
  });
}

export async function getDayEndById(restaurantId: string, dayEndId: string) {
  return prisma.dayEndClosure.findFirst({
    where: { id: dayEndId, restaurant_id: restaurantId },
    include: {
      outlet: true,
      variance_events: true,
      unlock_events: true,
    },
  });
}

export async function listDayEnds(params: {
  restaurantId: string;
  outletId?: string;
  from?: Date;
  to?: Date;
  status?: 'OPEN' | 'CLOSED' | 'LOCKED';
}) {
  return prisma.dayEndClosure.findMany({
    where: {
      restaurant_id: params.restaurantId,
      ...(params.outletId ? { outlet_id: params.outletId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...((params.from || params.to)
        ? {
            business_date: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    },
    include: { outlet: true },
    orderBy: [{ business_date: 'desc' }, { created_at: 'desc' }],
  });
}

export async function upsertDayEndClosure(data: {
  tenant_id: string;
  restaurant_id: string;
  outlet_id: string;
  business_date: Date;
  expected_cash: number;
  expected_card: number;
  expected_upi: number;
  expected_aggregator: number;
  actual_cash: number;
  actual_card: number;
  actual_upi: number;
  actual_aggregator: number;
  variance_cash: number;
  variance_card: number;
  variance_upi: number;
  variance_aggregator: number;
  expected_total: number;
  actual_total: number;
  variance_total: number;
  variance_percent: number;
  status: 'OPEN' | 'CLOSED' | 'LOCKED';
  closed_by_user_id?: string;
  closed_at?: Date;
  locked_at?: Date | null;
  lock_reason?: string | null;
}) {
  return prisma.dayEndClosure.upsert({
    where: {
      outlet_id_business_date: {
        outlet_id: data.outlet_id,
        business_date: data.business_date,
      },
    },
    create: {
      tenant_id: data.tenant_id,
      restaurant_id: data.restaurant_id,
      outlet_id: data.outlet_id,
      business_date: data.business_date,
      expected_cash: data.expected_cash,
      expected_card: data.expected_card,
      expected_upi: data.expected_upi,
      expected_aggregator: data.expected_aggregator,
      actual_cash: data.actual_cash,
      actual_card: data.actual_card,
      actual_upi: data.actual_upi,
      actual_aggregator: data.actual_aggregator,
      variance_cash: data.variance_cash,
      variance_card: data.variance_card,
      variance_upi: data.variance_upi,
      variance_aggregator: data.variance_aggregator,
      expected_total: data.expected_total,
      actual_total: data.actual_total,
      variance_total: data.variance_total,
      variance_percent: data.variance_percent,
      status: data.status,
      closed_by_user_id: data.closed_by_user_id ?? null,
      closed_at: data.closed_at ?? null,
      locked_at: data.locked_at ?? null,
      lock_reason: data.lock_reason ?? null,
    },
    update: {
      expected_cash: data.expected_cash,
      expected_card: data.expected_card,
      expected_upi: data.expected_upi,
      expected_aggregator: data.expected_aggregator,
      actual_cash: data.actual_cash,
      actual_card: data.actual_card,
      actual_upi: data.actual_upi,
      actual_aggregator: data.actual_aggregator,
      variance_cash: data.variance_cash,
      variance_card: data.variance_card,
      variance_upi: data.variance_upi,
      variance_aggregator: data.variance_aggregator,
      expected_total: data.expected_total,
      actual_total: data.actual_total,
      variance_total: data.variance_total,
      variance_percent: data.variance_percent,
      status: data.status,
      closed_by_user_id: data.closed_by_user_id ?? undefined,
      closed_at: data.closed_at ?? undefined,
      locked_at: data.locked_at ?? undefined,
      lock_reason: data.lock_reason ?? undefined,
    },
  });
}

export async function createDayEndVarianceEvent(data: {
  day_end_id: string;
  event_type: 'CLOSED' | 'LOCKED';
  metadata?: Prisma.InputJsonValue;
  created_by_user_id?: string;
}) {
  return prisma.dayEndVarianceEvent.create({
    data: {
      day_end_id: data.day_end_id,
      event_type: data.event_type,
      metadata: data.metadata,
      created_by_user_id: data.created_by_user_id ?? null,
    },
  });
}

export async function unlockDayEnd(data: {
  day_end_id: string;
  reason: string;
  unlocked_by_user_id: string;
}) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.dayEndClosure.update({
      where: { id: data.day_end_id },
      data: {
        status: 'CLOSED',
        unlocked_by_user_id: data.unlocked_by_user_id,
        unlocked_at: new Date(),
        unlock_reason: data.reason,
      },
    });

    await tx.dayEndUnlockEvent.create({
      data: {
        day_end_id: data.day_end_id,
        reason: data.reason,
        unlocked_by_user_id: data.unlocked_by_user_id,
      },
    });

    return updated;
  });
}

export async function findLockedDayEnd(params: {
  outletId: string;
  businessDate: Date;
}) {
  return prisma.dayEndClosure.findFirst({
    where: {
      outlet_id: params.outletId,
      business_date: params.businessDate,
      status: 'LOCKED',
    },
  });
}

export async function getOrdersForBusinessDate(params: {
  tenantId: string;
  restaurantId: string;
  outletId: string;
  startAt: Date;
  endAt: Date;
}) {
  return prisma.order.findMany({
    where: {
      tenant_id: params.tenantId,
      restaurant_id: params.restaurantId,
      outlet_id: params.outletId,
      payment_status: 'PAID',
      paid_at: {
        gte: params.startAt,
        lt: params.endAt,
      },
    },
    select: {
      id: true,
      source: true,
      payment_method: true,
      total_amount: true,
      payment_amount: true,
    },
  });
}

export async function createExportJob(data: {
  tenant_id: string;
  restaurant_id: string;
  outlet_id?: string | null;
  user_id?: string | null;
  dataset:
    | 'ORDERS'
    | 'SALES'
    | 'USERS'
    | 'CUSTOMERS'
    | 'PRODUCTS'
    | 'RESERVATIONS'
    | 'DAY_END'
    | 'GST_INVOICES'
    | 'TAX_SUMMARY'
    | 'GSTR1_SUMMARY'
    | 'GSTR3B_SUMMARY'
    | 'WAITER_PERFORMANCE'
    | 'PAYROLL'
    | 'AGGREGATOR_COMMISSION';
  format: 'CSV' | 'XLSX';
  filters?: Prisma.InputJsonValue;
  selected_columns?: string[];
}) {
  return prisma.exportJob.create({
    data: {
      tenant_id: data.tenant_id,
      restaurant_id: data.restaurant_id,
      outlet_id: data.outlet_id ?? null,
      user_id: data.user_id ?? null,
      dataset: data.dataset,
      format: data.format,
      filters: data.filters,
      selected_columns: data.selected_columns ?? [],
      status: 'QUEUED',
    },
  });
}

export async function listExportJobs(params: {
  restaurantId: string;
  status?: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  dataset?:
    | 'ORDERS'
    | 'SALES'
    | 'USERS'
    | 'CUSTOMERS'
    | 'PRODUCTS'
    | 'RESERVATIONS'
    | 'DAY_END'
    | 'GST_INVOICES'
    | 'TAX_SUMMARY'
    | 'GSTR1_SUMMARY'
    | 'GSTR3B_SUMMARY'
    | 'WAITER_PERFORMANCE'
    | 'PAYROLL'
    | 'AGGREGATOR_COMMISSION';
  outletId?: string;
}) {
  return prisma.exportJob.findMany({
    where: {
      restaurant_id: params.restaurantId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.dataset ? { dataset: params.dataset } : {}),
      ...(params.outletId ? { outlet_id: params.outletId } : {}),
    },
    include: { files: true, outlet: true },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
}

export async function getExportJobById(restaurantId: string, jobId: string) {
  return prisma.exportJob.findFirst({
    where: { id: jobId, restaurant_id: restaurantId },
    include: { files: true, outlet: true },
  });
}

export async function claimNextExportJob() {
  return prisma.$transaction(async (tx) => {
    const nextJob = await tx.exportJob.findFirst({
      where: { status: 'QUEUED' },
      orderBy: { created_at: 'asc' },
    });
    if (!nextJob) return null;

    return tx.exportJob.update({
      where: { id: nextJob.id },
      data: {
        status: 'RUNNING',
        started_at: new Date(),
        attempts: { increment: 1 },
      },
    });
  });
}

export async function completeExportJob(data: {
  jobId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes?: number;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.exportFile.create({
      data: {
        export_job_id: data.jobId,
        file_name: data.fileName,
        mime_type: data.mimeType,
        storage_path: data.storagePath,
        size_bytes: data.sizeBytes ?? null,
      },
    });

    return tx.exportJob.update({
      where: { id: data.jobId },
      data: {
        status: 'DONE',
        finished_at: new Date(),
        error_message: null,
      },
    });
  });
}

export async function failExportJob(jobId: string, message: string) {
  return prisma.exportJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      finished_at: new Date(),
      error_message: message.slice(0, 2000),
    },
  });
}

export async function getOrderForInvoice(tenantId: string, restaurantId: string, orderId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      tenant_id: tenantId,
      restaurant_id: restaurantId,
    },
    include: {
      outlet: true,
      items: {
        include: {
          product: {
            select: {
              id: true,
              hsn_sac: true,
              gst_rate_percent: true,
            },
          },
        },
      },
    },
  });
}

export async function findInvoiceByOrder(orderId: string) {
  return prisma.gstInvoice.findUnique({
    where: { order_id: orderId },
    include: {
      lines: true,
      outlet: true,
      series: true,
      order: true,
    },
  });
}

function getFinancialYear(d: Date) {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  if (month >= 4) {
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  }
  return `${year - 1}-${String(year % 100).padStart(2, '0')}`;
}

export async function getOrCreateInvoiceSeries(params: {
  tenantId: string;
  restaurantId: string;
  outletId: string;
  referenceDate: Date;
}) {
  const financialYear = getFinancialYear(params.referenceDate);
  const prefix = 'INV';

  const existing = await prisma.invoiceSeries.findFirst({
    where: {
      outlet_id: params.outletId,
      financial_year: financialYear,
      prefix,
    },
  });
  if (existing) return existing;

  return prisma.invoiceSeries.create({
    data: {
      tenant_id: params.tenantId,
      restaurant_id: params.restaurantId,
      outlet_id: params.outletId,
      financial_year: financialYear,
      prefix,
      next_number: 1,
      is_active: true,
    },
  });
}

export async function reserveNextInvoiceNumber(seriesId: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.invoiceSeries.update({
      where: { id: seriesId },
      data: { next_number: { increment: 1 } },
    });
    const seq = updated.next_number - 1;
    const invoiceNumber = `${updated.prefix}/${updated.financial_year}/${String(seq).padStart(6, '0')}`;
    return { series: updated, sequence: seq, invoiceNumber };
  });
}

export async function createInvoiceWithLines(data: {
  tenant_id: string;
  restaurant_id: string;
  outlet_id: string;
  order_id: string;
  series_id: string;
  invoice_number: string;
  invoice_type: 'B2B' | 'B2C';
  buyer_name?: string | null;
  buyer_gstin?: string | null;
  buyer_state_code?: string | null;
  seller_gstin?: string | null;
  seller_state_code?: string | null;
  is_tax_inclusive: boolean;
  subtotal_amount: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax_amount: number;
  grand_total_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  irn_status: 'NOT_APPLICABLE' | 'READY' | 'SUBMITTED' | 'SUCCESS' | 'FAILED';
  lines: Array<{
    order_item_id?: string | null;
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
  }>;
}) {
  return prisma.gstInvoice.create({
    data: {
      tenant_id: data.tenant_id,
      restaurant_id: data.restaurant_id,
      outlet_id: data.outlet_id,
      order_id: data.order_id,
      series_id: data.series_id,
      invoice_number: data.invoice_number,
      invoice_type: data.invoice_type,
      buyer_name: data.buyer_name ?? null,
      buyer_gstin: data.buyer_gstin ?? null,
      buyer_state_code: data.buyer_state_code ?? null,
      seller_gstin: data.seller_gstin ?? null,
      seller_state_code: data.seller_state_code ?? null,
      is_tax_inclusive: data.is_tax_inclusive,
      subtotal_amount: data.subtotal_amount,
      discount_amount: data.discount_amount,
      taxable_amount: data.taxable_amount,
      cgst_amount: data.cgst_amount,
      sgst_amount: data.sgst_amount,
      igst_amount: data.igst_amount,
      total_tax_amount: data.total_tax_amount,
      grand_total_amount: data.grand_total_amount,
      status: data.status,
      irn_status: data.irn_status,
      validated_at: new Date(),
      lines: {
        create: data.lines.map((line) => ({
          order_item_id: line.order_item_id ?? null,
          product_name: line.product_name,
          hsn_sac: line.hsn_sac ?? null,
          quantity: line.quantity,
          unit_price: line.unit_price,
          taxable_amount: line.taxable_amount,
          gst_rate_percent: line.gst_rate_percent,
          cgst_amount: line.cgst_amount,
          sgst_amount: line.sgst_amount,
          igst_amount: line.igst_amount,
          total_tax_amount: line.total_tax_amount,
          line_total_amount: line.line_total_amount,
        })),
      },
    },
    include: {
      lines: true,
      outlet: true,
      series: true,
      order: true,
    },
  });
}

export async function updateInvoiceForValidation(
  invoiceId: string,
  data: {
    buyer_name?: string | null;
    buyer_gstin?: string | null;
    buyer_state_code?: string | null;
    invoice_type: 'B2B' | 'B2C';
    status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
    irn_status: 'NOT_APPLICABLE' | 'READY' | 'SUBMITTED' | 'SUCCESS' | 'FAILED';
    is_tax_inclusive: boolean;
    subtotal_amount: number;
    discount_amount: number;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_tax_amount: number;
    grand_total_amount: number;
    lines: Array<{
      order_item_id?: string | null;
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
    }>;
  }
) {
  return prisma.$transaction(async (tx) => {
    await tx.gstInvoiceLine.deleteMany({ where: { invoice_id: invoiceId } });
    const updated = await tx.gstInvoice.update({
      where: { id: invoiceId },
      data: {
        buyer_name: data.buyer_name ?? null,
        buyer_gstin: data.buyer_gstin ?? null,
        buyer_state_code: data.buyer_state_code ?? null,
        invoice_type: data.invoice_type,
        status: data.status,
        irn_status: data.irn_status,
        is_tax_inclusive: data.is_tax_inclusive,
        subtotal_amount: data.subtotal_amount,
        discount_amount: data.discount_amount,
        taxable_amount: data.taxable_amount,
        cgst_amount: data.cgst_amount,
        sgst_amount: data.sgst_amount,
        igst_amount: data.igst_amount,
        total_tax_amount: data.total_tax_amount,
        grand_total_amount: data.grand_total_amount,
        validated_at: new Date(),
      },
    });

    await tx.gstInvoiceLine.createMany({
      data: data.lines.map((line) => ({
        invoice_id: invoiceId,
        order_item_id: line.order_item_id ?? null,
        product_name: line.product_name,
        hsn_sac: line.hsn_sac ?? null,
        quantity: line.quantity,
        unit_price: line.unit_price,
        taxable_amount: line.taxable_amount,
        gst_rate_percent: line.gst_rate_percent,
        cgst_amount: line.cgst_amount,
        sgst_amount: line.sgst_amount,
        igst_amount: line.igst_amount,
        total_tax_amount: line.total_tax_amount,
        line_total_amount: line.line_total_amount,
      })),
    });

    return updated;
  });
}

export async function updateEInvoiceResult(data: {
  invoiceId: string;
  status: 'NOT_APPLICABLE' | 'READY' | 'SUBMITTED' | 'SUCCESS' | 'FAILED';
  provider?: string | null;
  irn?: string | null;
  ack_no?: string | null;
  ack_date?: Date | null;
  signed_qr_payload?: string | null;
  einvoice_error?: Prisma.InputJsonValue | null;
}) {
  return prisma.gstInvoice.update({
    where: { id: data.invoiceId },
    data: {
      irn_status: data.status,
      einvoice_provider: data.provider ?? undefined,
      irn: data.irn ?? undefined,
      ack_no: data.ack_no ?? undefined,
      ack_date: data.ack_date ?? undefined,
      signed_qr_payload: data.signed_qr_payload ?? undefined,
      einvoice_error: data.einvoice_error ?? undefined,
      issued_at: data.status === 'SUCCESS' ? new Date() : undefined,
      status: data.status === 'SUCCESS' ? 'ISSUED' : undefined,
    },
  });
}
