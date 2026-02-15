-- DropIndex
DROP INDEX "restaurant_users_email_key";

-- DropIndex
DROP INDEX "restaurant_users_login_id_key";

-- AlterTable
ALTER TABLE "restaurant_users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "is_shared_login" BOOLEAN NOT NULL DEFAULT false;
