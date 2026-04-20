-- CreateEnum
CREATE TYPE "EventBookingStatus" AS ENUM ('ENQUIRY', 'CONFIRMED', 'DEPOSIT_PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "event_bookings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "hall_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_name" TEXT,
    "event_date" TIMESTAMP(3) NOT NULL,
    "event_end_date" TIMESTAMP(3),
    "guest_count" INTEGER NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "menu_notes" TEXT,
    "special_requests" TEXT,
    "advance_amount" DECIMAL(10,2),
    "total_amount" DECIMAL(10,2),
    "status" "EventBookingStatus" NOT NULL DEFAULT 'ENQUIRY',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "event_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_bookings_restaurant_id_event_date_idx" ON "event_bookings"("restaurant_id", "event_date");

-- CreateIndex
CREATE INDEX "event_bookings_restaurant_id_status_idx" ON "event_bookings"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "event_bookings_tenant_id_idx" ON "event_bookings"("tenant_id");

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_bookings" ADD CONSTRAINT "event_bookings_hall_id_fkey" FOREIGN KEY ("hall_id") REFERENCES "restaurant_halls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
