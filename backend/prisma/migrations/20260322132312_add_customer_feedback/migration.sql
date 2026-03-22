-- CreateTable
CREATE TABLE "customer_feedback" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "order_id" UUID,
    "customer_id" UUID,
    "customer_name" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_feedback_restaurant_id_idx" ON "customer_feedback"("restaurant_id");

-- CreateIndex
CREATE INDEX "customer_feedback_restaurant_id_rating_idx" ON "customer_feedback"("restaurant_id", "rating");

-- CreateIndex
CREATE INDEX "customer_feedback_order_id_idx" ON "customer_feedback"("order_id");

-- AddForeignKey
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
