/*
  Warnings:

  - The values [ADMIN] on the enum `RestaurantUserRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [STAFF] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `sort_order` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `RestaurantStaff` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[login_id]` on the table `restaurant_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `restaurant_users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `RestaurantStaff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RestaurantUserRole_new" AS ENUM ('OWNER', 'MANAGER', 'WAITER');
ALTER TABLE "restaurant_users" ALTER COLUMN "role" TYPE "RestaurantUserRole_new" USING ("role"::text::"RestaurantUserRole_new");
ALTER TYPE "RestaurantUserRole" RENAME TO "RestaurantUserRole_old";
ALTER TYPE "RestaurantUserRole_new" RENAME TO "RestaurantUserRole";
DROP TYPE "public"."RestaurantUserRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'MANAGER', 'WAITER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WAITER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_category_id_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantStaff" DROP CONSTRAINT "RestaurantStaff_user_id_fkey";

-- DropIndex
DROP INDEX "Category_sort_order_idx";

-- DropIndex
DROP INDEX "RestaurantStaff_user_id_restaurant_id_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "sort_order";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costprice" DECIMAL(10,2),
ADD COLUMN     "discount_percent" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "is_veg" BOOLEAN,
ADD COLUMN     "preparation_time_minutes" INTEGER,
ALTER COLUMN "category_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "closing_hours" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "restaurant_type" TEXT,
ADD COLUMN     "tagline" TEXT;

-- AlterTable
ALTER TABLE "RestaurantStaff" DROP COLUMN "user_id",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "salary" TEXT,
ADD COLUMN     "shift_detail" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'WAITER';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "arrive_at" TEXT,
ADD COLUMN     "waiter_id" UUID;

-- AlterTable
ALTER TABLE "restaurant_users" ADD COLUMN     "completed_orders_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "login_id" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profile_image_url" TEXT,
ADD COLUMN     "salary" DECIMAL(10,2),
ADD COLUMN     "session_expires_at" TIMESTAMP(3),
ADD COLUMN     "shift_detail" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "table_qrcodes" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "menu_url" TEXT NOT NULL,
    "qr_png_path" TEXT NOT NULL,
    "qr_pdf_path" TEXT NOT NULL,
    "qr_png_url" TEXT,
    "qr_pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_qrcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "table_qrcodes_table_id_key" ON "table_qrcodes"("table_id");

-- CreateIndex
CREATE INDEX "table_qrcodes_table_id_idx" ON "table_qrcodes"("table_id");

-- CreateIndex
CREATE INDEX "Category_restaurant_id_is_active_idx" ON "Category"("restaurant_id", "is_active");

-- CreateIndex
CREATE INDEX "Product_restaurant_id_is_available_idx" ON "Product"("restaurant_id", "is_available");

-- CreateIndex
CREATE INDEX "Product_restaurant_id_category_id_idx" ON "Product"("restaurant_id", "category_id");

-- CreateIndex
CREATE INDEX "orders_waiter_id_idx" ON "orders"("waiter_id");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_placed_at_order_number_idx" ON "orders"("restaurant_id", "placed_at", "order_number");

-- CreateIndex
CREATE INDEX "orders_customer_phone_placed_at_idx" ON "orders"("customer_phone", "placed_at");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_users_login_id_key" ON "restaurant_users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_users_email_key" ON "restaurant_users"("email");

-- CreateIndex
CREATE INDEX "restaurant_users_login_id_idx" ON "restaurant_users"("login_id");

-- CreateIndex
CREATE INDEX "restaurant_users_email_idx" ON "restaurant_users"("email");

-- CreateIndex
CREATE INDEX "restaurant_users_user_id_is_active_idx" ON "restaurant_users"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "restaurant_users_restaurant_id_is_active_idx" ON "restaurant_users"("restaurant_id", "is_active");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_fkey" FOREIGN KEY ("waiter_id") REFERENCES "restaurant_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_qrcodes" ADD CONSTRAINT "table_qrcodes_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
