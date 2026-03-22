-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'LEFT', 'NOTIFIED');

-- CreateTable
CREATE TABLE "table_waitlist" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "outlet_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "party_size" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimated_wait_minutes" INTEGER,
    "notified_at" TIMESTAMP(3),
    "seated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "table_waitlist_restaurant_id_status_idx" ON "table_waitlist"("restaurant_id", "status");

-- CreateIndex
CREATE INDEX "table_waitlist_restaurant_id_joined_at_idx" ON "table_waitlist"("restaurant_id", "joined_at");

-- AddForeignKey
ALTER TABLE "table_waitlist" ADD CONSTRAINT "table_waitlist_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
