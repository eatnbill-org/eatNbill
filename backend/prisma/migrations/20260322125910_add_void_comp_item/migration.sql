-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "comp_reason" TEXT,
ADD COLUMN     "void_reason" TEXT,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "voided_by_user_id" UUID;
