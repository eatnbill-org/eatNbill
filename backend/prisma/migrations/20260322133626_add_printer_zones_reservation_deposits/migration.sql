-- CreateTable
CREATE TABLE "printer_zones" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "printer_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_deposits" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "reservation_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_ref" TEXT,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservation_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "printer_zones_restaurant_id_idx" ON "printer_zones"("restaurant_id");

-- CreateIndex
CREATE INDEX "reservation_deposits_reservation_id_idx" ON "reservation_deposits"("reservation_id");

-- AddForeignKey
ALTER TABLE "printer_zones" ADD CONSTRAINT "printer_zones_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_deposits" ADD CONSTRAINT "reservation_deposits_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "table_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
