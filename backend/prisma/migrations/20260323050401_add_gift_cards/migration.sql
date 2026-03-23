-- CreateTable
CREATE TABLE "gift_cards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "initial_value" DECIMAL(10,2) NOT NULL,
    "remaining_value" DECIMAL(10,2) NOT NULL,
    "issued_to" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gift_cards_restaurant_id_idx" ON "gift_cards"("restaurant_id");

-- CreateIndex
CREATE INDEX "gift_cards_tenant_id_idx" ON "gift_cards"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_restaurant_id_code_key" ON "gift_cards"("restaurant_id", "code");

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
