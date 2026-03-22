-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('GST_INDIA', 'VAT_UK', 'SALES_TAX_US', 'HST_CANADA', 'NONE');

-- AlterTable
ALTER TABLE "restaurant_outlets" ADD COLUMN     "tax_regime" "TaxRegime" NOT NULL DEFAULT 'GST_INDIA',
ADD COLUMN     "vat_number" TEXT;

-- AlterTable
ALTER TABLE "restaurant_settings" ADD COLUMN     "service_charge_percent" DECIMAL(5,2);
