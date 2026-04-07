-- Reservation status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReservationStatus') THEN
    CREATE TYPE "ReservationStatus" AS ENUM ('BOOKED', 'SEATED', 'CANCELLED', 'COMPLETED');
  END IF;
END
$$;

-- Reservation table
CREATE TABLE IF NOT EXISTS "table_reservations" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "restaurant_id" UUID NOT NULL,
  "table_id" UUID NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT,
  "party_size" INTEGER NOT NULL,
  "reserved_from" TIMESTAMP(3) NOT NULL,
  "reserved_to" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'BOOKED',
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  CONSTRAINT "table_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "table_reservations_reserved_window_check" CHECK ("reserved_to" > "reserved_from"),
  CONSTRAINT "table_reservations_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "table_reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "table_reservations_restaurant_id_reserved_from_idx"
  ON "table_reservations"("restaurant_id", "reserved_from");

CREATE INDEX IF NOT EXISTS "table_reservations_restaurant_id_status_idx"
  ON "table_reservations"("restaurant_id", "status");

CREATE INDEX IF NOT EXISTS "table_reservations_table_id_reserved_from_reserved_to_idx"
  ON "table_reservations"("table_id", "reserved_from", "reserved_to");

-- DB-level overlap protection for active reservations
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'table_reservations_no_overlap_active'
  ) THEN
    ALTER TABLE "table_reservations"
      ADD CONSTRAINT "table_reservations_no_overlap_active"
      EXCLUDE USING GIST (
        "table_id" WITH =,
        tsrange("reserved_from", "reserved_to", '[)') WITH &&
      )
      WHERE ("status" IN ('BOOKED', 'SEATED'));
  END IF;
END
$$;
