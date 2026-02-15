/*
  Warnings:

  - You are about to drop the column `average_order_value` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `first_visit_date` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `last_order_date` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `last_visit_date` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `total_spent` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `visit_count` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `restaurant_users` table. All the data in the column will be lost.
  - You are about to drop the column `session_expires_at` on the `restaurant_users` table. All the data in the column will be lost.
  - You are about to drop the column `qr_png_path` on the `table_qrcodes` table. All the data in the column will be lost.
  - You are about to drop the column `qr_png_url` on the `table_qrcodes` table. All the data in the column will be lost.
  - You are about to drop the `BlockedIP` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestaurantStaff` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `role` on the `restaurant_users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "RestaurantStaff" DROP CONSTRAINT "RestaurantStaff_restaurant_id_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantStaff" DROP CONSTRAINT "RestaurantStaff_tenant_id_fkey";

-- DropIndex
DROP INDEX "orders_customer_phone_placed_at_idx";

-- DropIndex
DROP INDEX "orders_external_order_id_idx";

-- DropIndex
DROP INDEX "orders_restaurant_id_idx";

-- DropIndex
DROP INDEX "orders_restaurant_id_placed_at_order_number_idx";

-- DropIndex
DROP INDEX "orders_tenant_id_idx";

-- DropIndex
DROP INDEX "orders_tenant_id_restaurant_id_idx";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "average_order_value",
DROP COLUMN "first_visit_date",
DROP COLUMN "last_order_date",
DROP COLUMN "last_visit_date",
DROP COLUMN "total_spent",
DROP COLUMN "visit_count";

-- AlterTable
ALTER TABLE "restaurant_users" DROP COLUMN "last_login_at",
DROP COLUMN "session_expires_at",
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL;

-- AlterTable
ALTER TABLE "table_qrcodes" DROP COLUMN "qr_png_path",
DROP COLUMN "qr_png_url";

-- DropTable
DROP TABLE "BlockedIP";

-- DropTable
DROP TABLE "RestaurantStaff";

-- DropEnum
DROP TYPE "RestaurantUserRole";

-- CreateIndex
CREATE INDEX "restaurant_users_restaurant_id_role_idx" ON "restaurant_users"("restaurant_id", "role");
