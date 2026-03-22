-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tip_amount" DECIMAL(10,2) DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurant_settings" ADD COLUMN     "tips_enabled" BOOLEAN NOT NULL DEFAULT false;
