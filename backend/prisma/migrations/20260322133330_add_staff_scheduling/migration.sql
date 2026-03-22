-- CreateTable
CREATE TABLE "staff_schedules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_time_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "total_minutes" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_schedules_restaurant_id_idx" ON "staff_schedules"("restaurant_id");

-- CreateIndex
CREATE INDEX "staff_schedules_user_id_idx" ON "staff_schedules"("user_id");

-- CreateIndex
CREATE INDEX "staff_schedules_restaurant_id_date_idx" ON "staff_schedules"("restaurant_id", "date");

-- CreateIndex
CREATE INDEX "staff_time_entries_restaurant_id_idx" ON "staff_time_entries"("restaurant_id");

-- CreateIndex
CREATE INDEX "staff_time_entries_user_id_idx" ON "staff_time_entries"("user_id");

-- CreateIndex
CREATE INDEX "staff_time_entries_restaurant_id_clock_in_idx" ON "staff_time_entries"("restaurant_id", "clock_in");

-- AddForeignKey
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "restaurant_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_time_entries" ADD CONSTRAINT "staff_time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "restaurant_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
