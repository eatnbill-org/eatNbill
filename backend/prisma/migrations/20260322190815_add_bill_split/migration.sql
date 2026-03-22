-- CreateEnum
CREATE TYPE "SplitType" AS ENUM ('EQUAL', 'BY_ITEM', 'CUSTOM');

-- CreateTable
CREATE TABLE "bill_splits" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "split_type" "SplitType" NOT NULL DEFAULT 'EQUAL',
    "payer_label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_splits" (
    "id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_item_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bill_splits_order_id_idx" ON "bill_splits"("order_id");

-- CreateIndex
CREATE INDEX "order_item_splits_split_id_idx" ON "order_item_splits"("split_id");

-- AddForeignKey
ALTER TABLE "bill_splits" ADD CONSTRAINT "bill_splits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_splits" ADD CONSTRAINT "order_item_splits_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "bill_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_splits" ADD CONSTRAINT "order_item_splits_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
