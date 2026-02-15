/*
  Warnings:

  - You are about to drop the column `tenant_id` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `integration_configs` table. All the data in the column will be lost.
  - You are about to drop the column `tenant_id` on the `integration_webhook_logs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "integration_configs" DROP CONSTRAINT "integration_configs_tenant_id_fkey";

-- DropIndex
DROP INDEX "Category_tenant_id_idx";

-- DropIndex
DROP INDEX "Category_tenant_id_restaurant_id_idx";

-- DropIndex
DROP INDEX "Product_tenant_id_idx";

-- DropIndex
DROP INDEX "Product_tenant_id_restaurant_id_idx";

-- DropIndex
DROP INDEX "Restaurant_tenant_id_slug_key";

-- DropIndex
DROP INDEX "integration_configs_tenant_id_idx";

-- DropIndex
DROP INDEX "integration_webhook_logs_tenant_id_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "credit_balance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "integration_configs" DROP COLUMN "tenant_id";

-- AlterTable
ALTER TABLE "integration_webhook_logs" DROP COLUMN "tenant_id";

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
