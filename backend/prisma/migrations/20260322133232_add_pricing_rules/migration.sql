-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "discount_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(10,2) NOT NULL,
    "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "applicable_to" TEXT NOT NULL DEFAULT 'ALL',
    "category_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "product_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_restaurant_id_idx" ON "pricing_rules"("restaurant_id");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
