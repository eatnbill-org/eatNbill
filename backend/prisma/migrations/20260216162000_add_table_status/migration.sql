DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TableStatus') THEN
    CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED');
  END IF;
END
$$;

ALTER TABLE "restaurant_tables"
ADD COLUMN IF NOT EXISTS "table_status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE';

UPDATE "restaurant_tables"
SET "table_status" = 'AVAILABLE'
WHERE "table_status" IS NULL;
