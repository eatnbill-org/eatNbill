-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "fssai_license" TEXT;

-- AlterTable
ALTER TABLE "day_end_closures" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "export_files" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "export_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gst_invoice_lines" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gst_invoices" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoice_series" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "restaurant_outlets" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "table_reservations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
