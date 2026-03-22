-- CreateTable
CREATE TABLE "menu_sync_logs" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "triggered_by" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "items_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "menu_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_sync_logs_integration_id_idx" ON "menu_sync_logs"("integration_id");

-- CreateIndex
CREATE INDEX "menu_sync_logs_started_at_idx" ON "menu_sync_logs"("started_at");

-- AddForeignKey
ALTER TABLE "menu_sync_logs" ADD CONSTRAINT "menu_sync_logs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
