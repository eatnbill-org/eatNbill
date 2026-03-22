-- CreateTable
CREATE TABLE "notification_channels" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "combo_price" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_components" (
    "id" UUID NOT NULL,
    "combo_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "radius_km" DECIMAL(8,2),
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "min_order_amount" DECIMAL(10,2),
    "eta_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_restaurant_id_type_key" ON "notification_channels"("restaurant_id", "type");

-- CreateIndex
CREATE INDEX "notification_logs_restaurant_id_idx" ON "notification_logs"("restaurant_id");

-- CreateIndex
CREATE INDEX "notification_logs_channel_id_idx" ON "notification_logs"("channel_id");

-- CreateIndex
CREATE INDEX "combo_products_restaurant_id_idx" ON "combo_products"("restaurant_id");

-- CreateIndex
CREATE INDEX "combo_components_combo_id_idx" ON "combo_components"("combo_id");

-- CreateIndex
CREATE INDEX "delivery_zones_restaurant_id_idx" ON "delivery_zones"("restaurant_id");

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "notification_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_products" ADD CONSTRAINT "combo_products_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_combo_id_fkey" FOREIGN KEY ("combo_id") REFERENCES "combo_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_components" ADD CONSTRAINT "combo_components_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
