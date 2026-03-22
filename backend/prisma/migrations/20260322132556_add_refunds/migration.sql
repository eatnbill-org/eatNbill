-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "reason_code" TEXT,
    "notes" TEXT,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refunds_restaurant_id_idx" ON "refunds"("restaurant_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
