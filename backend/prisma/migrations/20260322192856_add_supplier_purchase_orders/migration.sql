-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gst_number" TEXT,
    "payment_terms" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMP(3),
    "received_date" TIMESTAMP(3),
    "total_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "po_id" UUID NOT NULL,
    "ingredient_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(10,4) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "received_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_restaurant_id_idx" ON "suppliers"("restaurant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_restaurant_id_idx" ON "purchase_orders"("restaurant_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_po_id_idx" ON "purchase_order_lines"("po_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
