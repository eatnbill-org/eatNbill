CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LanguageCode') THEN
    CREATE TYPE "LanguageCode" AS ENUM ('EN', 'HI', 'GU', 'MR', 'FR', 'DE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceiptTemplate') THEN
    CREATE TYPE "ReceiptTemplate" AS ENUM ('MM80_STANDARD', 'MM58_COMPACT', 'A4_TAX_INVOICE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxPricingMode') THEN
    CREATE TYPE "TaxPricingMode" AS ENUM ('TAX_INCLUSIVE', 'TAX_EXCLUSIVE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DayEndStatus') THEN
    CREATE TYPE "DayEndStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DayEndVarianceEventType') THEN
    CREATE TYPE "DayEndVarianceEventType" AS ENUM ('CLOSED', 'LOCKED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportDataset') THEN
    CREATE TYPE "ExportDataset" AS ENUM ('ORDERS', 'SALES', 'USERS', 'CUSTOMERS', 'PRODUCTS', 'RESERVATIONS', 'DAY_END', 'GST_INVOICES', 'TAX_SUMMARY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportFormat') THEN
    CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExportJobStatus') THEN
    CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN
    CREATE TYPE "InvoiceType" AS ENUM ('B2B', 'B2C');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GstInvoiceStatus') THEN
    CREATE TYPE "GstInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EInvoiceStatus') THEN
    CREATE TYPE "EInvoiceStatus" AS ENUM ('NOT_APPLICABLE', 'READY', 'SUBMITTED', 'SUCCESS', 'FAILED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "restaurant_outlets" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "address" TEXT,
  "gstin" TEXT,
  "state_code" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "default_language" "LanguageCode" NOT NULL DEFAULT 'EN',
  "receipt_template" "ReceiptTemplate" NOT NULL DEFAULT 'MM80_STANDARD',
  "variance_lock_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_lock_percent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "tax_pricing_mode" "TaxPricingMode" NOT NULL DEFAULT 'TAX_INCLUSIVE',
  "is_einvoice_enabled" BOOLEAN NOT NULL DEFAULT false,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_outlets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "restaurant_outlets_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_outlets_restaurant_id_name_key" ON "restaurant_outlets"("restaurant_id", "name");
CREATE INDEX IF NOT EXISTS "restaurant_outlets_restaurant_id_idx" ON "restaurant_outlets"("restaurant_id");
CREATE INDEX IF NOT EXISTS "restaurant_outlets_restaurant_id_is_default_idx" ON "restaurant_outlets"("restaurant_id", "is_default");

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "preferred_language" "LanguageCode",
  "default_outlet_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_preferences_tenant_id_idx" ON "user_preferences"("tenant_id");
CREATE INDEX IF NOT EXISTS "user_preferences_default_outlet_id_idx" ON "user_preferences"("default_outlet_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_default_outlet_id_fkey'
  ) THEN
    ALTER TABLE "user_preferences"
    ADD CONSTRAINT "user_preferences_default_outlet_id_fkey"
    FOREIGN KEY ("default_outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "hsn_sac" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "gst_rate_percent" NUMERIC(5,2);

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "outlet_id" UUID;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsn_sac_snapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "gst_rate_snapshot" NUMERIC(5,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxable_amount_snapshot" NUMERIC(10,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "cgst_amount_snapshot" NUMERIC(10,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sgst_amount_snapshot" NUMERIC(10,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "igst_amount_snapshot" NUMERIC(10,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "total_tax_snapshot" NUMERIC(10,2);

ALTER TABLE "restaurant_halls" ADD COLUMN IF NOT EXISTS "outlet_id" UUID;
ALTER TABLE "restaurant_tables" ADD COLUMN IF NOT EXISTS "outlet_id" UUID;
ALTER TABLE "table_reservations" ADD COLUMN IF NOT EXISTS "outlet_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_outlet_id_fkey') THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_outlet_id_fkey"
      FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_halls_outlet_id_fkey') THEN
    ALTER TABLE "restaurant_halls"
      ADD CONSTRAINT "restaurant_halls_outlet_id_fkey"
      FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurant_tables_outlet_id_fkey') THEN
    ALTER TABLE "restaurant_tables"
      ADD CONSTRAINT "restaurant_tables_outlet_id_fkey"
      FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'table_reservations_outlet_id_fkey') THEN
    ALTER TABLE "table_reservations"
      ADD CONSTRAINT "table_reservations_outlet_id_fkey"
      FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "orders_outlet_id_idx" ON "orders"("outlet_id");
CREATE INDEX IF NOT EXISTS "restaurant_halls_outlet_id_idx" ON "restaurant_halls"("outlet_id");
CREATE INDEX IF NOT EXISTS "restaurant_tables_outlet_id_idx" ON "restaurant_tables"("outlet_id");
CREATE INDEX IF NOT EXISTS "table_reservations_outlet_id_reserved_from_idx" ON "table_reservations"("outlet_id", "reserved_from");

INSERT INTO "restaurant_outlets" (
  "id",
  "tenant_id",
  "restaurant_id",
  "name",
  "code",
  "address",
  "gstin",
  "timezone",
  "default_language",
  "receipt_template",
  "variance_lock_amount",
  "variance_lock_percent",
  "tax_pricing_mode",
  "is_einvoice_enabled",
  "is_default",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  r."tenant_id",
  r."id",
  'Main Outlet',
  'MAIN',
  r."address",
  r."gst_number",
  'Asia/Kolkata',
  'EN'::"LanguageCode",
  'MM80_STANDARD'::"ReceiptTemplate",
  0,
  0,
  'TAX_INCLUSIVE'::"TaxPricingMode",
  false,
  true,
  NOW(),
  NOW()
FROM "Restaurant" r
WHERE NOT EXISTS (
  SELECT 1
  FROM "restaurant_outlets" o
  WHERE o."restaurant_id" = r."id"
    AND o."is_default" = true
);

UPDATE "restaurant_halls" h
SET "outlet_id" = o."id"
FROM "restaurant_outlets" o
WHERE h."restaurant_id" = o."restaurant_id"
  AND o."is_default" = true
  AND h."outlet_id" IS NULL;

UPDATE "restaurant_tables" t
SET "outlet_id" = COALESCE(
  (SELECT h."outlet_id" FROM "restaurant_halls" h WHERE h."id" = t."hall_id"),
  (SELECT o."id" FROM "restaurant_outlets" o WHERE o."restaurant_id" = t."restaurant_id" AND o."is_default" = true LIMIT 1)
)
WHERE t."outlet_id" IS NULL;

UPDATE "orders" ord
SET "outlet_id" = COALESCE(
  (SELECT t."outlet_id" FROM "restaurant_tables" t WHERE t."id" = ord."table_id"),
  (SELECT h."outlet_id" FROM "restaurant_halls" h WHERE h."id" = ord."hall_id"),
  (SELECT o."id" FROM "restaurant_outlets" o WHERE o."restaurant_id" = ord."restaurant_id" AND o."is_default" = true LIMIT 1)
)
WHERE ord."outlet_id" IS NULL;

UPDATE "table_reservations" tr
SET "outlet_id" = COALESCE(
  (SELECT t."outlet_id" FROM "restaurant_tables" t WHERE t."id" = tr."table_id"),
  (SELECT o."id" FROM "restaurant_outlets" o WHERE o."restaurant_id" = tr."restaurant_id" AND o."is_default" = true LIMIT 1)
)
WHERE tr."outlet_id" IS NULL;

CREATE TABLE IF NOT EXISTS "day_end_closures" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "expected_cash" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "expected_card" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "expected_upi" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "expected_aggregator" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "actual_cash" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "actual_card" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "actual_upi" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "actual_aggregator" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_cash" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_card" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_upi" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_aggregator" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "expected_total" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "actual_total" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_total" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "variance_percent" NUMERIC(5,2) NOT NULL DEFAULT 0,
  "status" "DayEndStatus" NOT NULL DEFAULT 'OPEN',
  "closed_by_user_id" UUID,
  "closed_at" TIMESTAMP(3),
  "locked_at" TIMESTAMP(3),
  "lock_reason" TEXT,
  "unlocked_by_user_id" UUID,
  "unlocked_at" TIMESTAMP(3),
  "unlock_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "day_end_closures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "day_end_closures_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "day_end_closures_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "day_end_closures_outlet_id_business_date_key" ON "day_end_closures"("outlet_id", "business_date");
CREATE INDEX IF NOT EXISTS "day_end_closures_restaurant_id_business_date_idx" ON "day_end_closures"("restaurant_id", "business_date");
CREATE INDEX IF NOT EXISTS "day_end_closures_outlet_id_status_idx" ON "day_end_closures"("outlet_id", "status");

CREATE TABLE IF NOT EXISTS "day_end_variance_events" (
  "id" UUID NOT NULL,
  "day_end_id" UUID NOT NULL,
  "event_type" "DayEndVarianceEventType" NOT NULL,
  "metadata" JSONB,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "day_end_variance_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "day_end_variance_events_day_end_id_fkey" FOREIGN KEY ("day_end_id") REFERENCES "day_end_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "day_end_variance_events_day_end_id_idx" ON "day_end_variance_events"("day_end_id");
CREATE INDEX IF NOT EXISTS "day_end_variance_events_created_at_idx" ON "day_end_variance_events"("created_at");

CREATE TABLE IF NOT EXISTS "day_end_unlock_events" (
  "id" UUID NOT NULL,
  "day_end_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "unlocked_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "day_end_unlock_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "day_end_unlock_events_day_end_id_fkey" FOREIGN KEY ("day_end_id") REFERENCES "day_end_closures"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "day_end_unlock_events_day_end_id_idx" ON "day_end_unlock_events"("day_end_id");
CREATE INDEX IF NOT EXISTS "day_end_unlock_events_created_at_idx" ON "day_end_unlock_events"("created_at");

CREATE TABLE IF NOT EXISTS "export_jobs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "outlet_id" UUID,
  "user_id" UUID,
  "dataset" "ExportDataset" NOT NULL,
  "format" "ExportFormat" NOT NULL,
  "filters" JSONB,
  "selected_columns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error_message" TEXT,
  "started_at" TIMESTAMP(3),
  "finished_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "export_jobs_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "export_jobs_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "export_jobs_restaurant_id_status_created_at_idx" ON "export_jobs"("restaurant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "export_jobs_user_id_created_at_idx" ON "export_jobs"("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "export_files" (
  "id" UUID NOT NULL,
  "export_job_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "size_bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "export_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "export_files_export_job_id_fkey" FOREIGN KEY ("export_job_id") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "export_files_export_job_id_idx" ON "export_files"("export_job_id");

CREATE TABLE IF NOT EXISTS "invoice_series" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "financial_year" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_series_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_series_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "invoice_series_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoice_series_outlet_id_financial_year_prefix_key" ON "invoice_series"("outlet_id", "financial_year", "prefix");
CREATE INDEX IF NOT EXISTS "invoice_series_restaurant_id_financial_year_idx" ON "invoice_series"("restaurant_id", "financial_year");

CREATE TABLE IF NOT EXISTS "gst_invoices" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "series_id" UUID NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "invoice_type" "InvoiceType" NOT NULL DEFAULT 'B2C',
  "status" "GstInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "buyer_name" TEXT,
  "buyer_gstin" TEXT,
  "buyer_state_code" TEXT,
  "seller_gstin" TEXT,
  "seller_state_code" TEXT,
  "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT true,
  "subtotal_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "discount_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "taxable_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "cgst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "sgst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "igst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "total_tax_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "grand_total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "irn_status" "EInvoiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  "irn" TEXT,
  "ack_no" TEXT,
  "ack_date" TIMESTAMP(3),
  "signed_qr_payload" TEXT,
  "einvoice_provider" TEXT,
  "einvoice_error" JSONB,
  "validated_at" TIMESTAMP(3),
  "issued_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gst_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gst_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gst_invoices_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gst_invoices_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "restaurant_outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gst_invoices_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "invoice_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "gst_invoices_order_id_key" ON "gst_invoices"("order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "gst_invoices_invoice_number_key" ON "gst_invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "gst_invoices_restaurant_id_created_at_idx" ON "gst_invoices"("restaurant_id", "created_at");
CREATE INDEX IF NOT EXISTS "gst_invoices_outlet_id_invoice_number_idx" ON "gst_invoices"("outlet_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "gst_invoices_irn_status_idx" ON "gst_invoices"("irn_status");

CREATE TABLE IF NOT EXISTS "gst_invoice_lines" (
  "id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "order_item_id" UUID,
  "product_name" TEXT NOT NULL,
  "hsn_sac" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" NUMERIC(10,2) NOT NULL,
  "taxable_amount" NUMERIC(10,2) NOT NULL,
  "gst_rate_percent" NUMERIC(5,2) NOT NULL,
  "cgst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "sgst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "igst_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "total_tax_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "line_total_amount" NUMERIC(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gst_invoice_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gst_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "gst_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gst_invoice_lines_invoice_id_idx" ON "gst_invoice_lines"("invoice_id");
CREATE INDEX IF NOT EXISTS "gst_invoice_lines_order_item_id_idx" ON "gst_invoice_lines"("order_item_id");

INSERT INTO "invoice_series" (
  "id",
  "tenant_id",
  "restaurant_id",
  "outlet_id",
  "financial_year",
  "prefix",
  "next_number",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  o."tenant_id",
  o."restaurant_id",
  o."id",
  CASE
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4
      THEN CONCAT(EXTRACT(YEAR FROM CURRENT_DATE)::INT, '-', RIGHT((EXTRACT(YEAR FROM CURRENT_DATE)::INT + 1)::TEXT, 2))
    ELSE CONCAT((EXTRACT(YEAR FROM CURRENT_DATE)::INT - 1), '-', RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::INT::TEXT, 2))
  END,
  'INV',
  1,
  true,
  NOW(),
  NOW()
FROM "restaurant_outlets" o
ON CONFLICT ("outlet_id", "financial_year", "prefix") DO NOTHING;
