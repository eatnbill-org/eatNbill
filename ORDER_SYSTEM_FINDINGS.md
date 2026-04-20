# Order System - Complete Findings

## 1. PRISMA SCHEMA DEFINITION

### Order Model
**Location:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L199)

```prisma
model Order {
  id                String           @id @default(uuid()) @db.Uuid
  tenant_id         String           @db.Uuid
  restaurant_id     String           @db.Uuid
  outlet_id         String?          @db.Uuid
  table_id          String?          @db.Uuid
  hall_id           String?          @db.Uuid
  customer_id       String?          @db.Uuid
  waiter_id         String?          @db.Uuid // Which waiter took this order
  order_number      String
  customer_name     String
  customer_phone    String
  table_number      String?
  external_order_id String?
  external_metadata Json?
  notes             String?
  total_amount      Decimal          @db.Decimal(10, 2)
  discount_amount   Decimal?         @default(0) @db.Decimal(10, 2)
  status            OrderStatus      @default(ACTIVE)
  source            OrderSource      @default(QR)
  order_type        OrderType        @default(DINE_IN)
  payment_method    PaymentMethod?
  payment_status    PaymentStatus    @default(PENDING)
  payment_provider  String?
  payment_reference String?
  payment_amount    Decimal?         @db.Decimal(10, 2)
  paid_at           DateTime?
  placed_at         DateTime         @default(now())
  confirmed_at      DateTime?
  preparing_at      DateTime?
  ready_at          DateTime?
  completed_at      DateTime?
  cancelled_at      DateTime?
  cancel_reason     String?
  arrive_at         String?
  created_at        DateTime         @default(now())
  updated_at        DateTime         @updatedAt
  
  // Relations
  items             OrderItem[]
  restaurant        Restaurant       @relation(fields: [restaurant_id], references: [id])
  table             RestaurantTable? @relation(fields: [table_id], references: [id])
  hall              RestaurantHall?  @relation(fields: [hall_id], references: [id])
  outlet            RestaurantOutlet? @relation(fields: [outlet_id], references: [id])
  customer          Customer?        @relation(fields: [customer_id], references: [id])
  waiter            RestaurantUser?  @relation(fields: [waiter_id], references: [id])
  gst_invoice       GstInvoice?

  @@unique([source, external_order_id])
  @@index([restaurant_id, status])
  @@index([outlet_id])
  @@index([restaurant_id, placed_at])
  @@index([customer_phone])
  @@index([waiter_id])
  @@map("orders")
}
```

### OrderItem Model
```prisma
model OrderItem {
  id             String  @id @default(uuid()) @db.Uuid
  order_id       String  @db.Uuid
  product_id     String  @db.Uuid
  name_snapshot  String
  price_snapshot Decimal @db.Decimal(10, 2)
  cost_snapshot  Decimal? @db.Decimal(10, 2) // Cost price at order time for profit calculation
  hsn_sac_snapshot String?
  gst_rate_snapshot Decimal? @db.Decimal(5, 2)
  taxable_amount_snapshot Decimal? @db.Decimal(10, 2)
  cgst_amount_snapshot Decimal? @db.Decimal(10, 2)
  sgst_amount_snapshot Decimal? @db.Decimal(10, 2)
  igst_amount_snapshot Decimal? @db.Decimal(10, 2)
  total_tax_snapshot Decimal? @db.Decimal(10, 2)
  quantity       Int
  notes          String?
  status         String  @default("PENDING") // Status of individual item (PENDING, REORDER, SERVED)
  created_at     DateTime @default(now())
  
  order          Order   @relation(fields: [order_id], references: [id], onDelete: Cascade)
  product        Product @relation(fields: [product_id], references: [id])

  @@index([order_id])
  @@index([product_id])
  @@map("order_items")
}
```

### Enums
**Location:** [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L363)

```prisma
enum OrderStatus {
  ACTIVE      // Order is ongoing, table is occupied
  COMPLETED   // Payment done, table is free
  CANCELLED   // Order was cancelled
}

enum OrderSource {
  QR       // QR code (customer ordered via QR)
  WEB      // Web ordering
  MANUAL   // Staff created
  ZOMATO   // Integration
  SWIGGY   // Integration
}

enum OrderType {
  DINE_IN    // Seated at table
  TAKEAWAY   // Pickup
  DELIVERY   // Delivery service
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  CREDIT      // Store credit/tab
  GPAY
  APPLE_PAY
  OTHER
}

enum PaymentStatus {
  PENDING
  PAID
}
```

---

## 2. BACKEND API ENDPOINTS

**Location:** [backend/src/modules/orders/routes.ts](backend/src/modules/orders/routes.ts)

### Public Routes (No Auth Required)
- **POST** `/api/v1/public/:restaurant_slug/orders` - Place public order (rate limited: 10 req/min per phone+IP)
- **GET** `/api/v1/public/:restaurant_slug/customers/search` - Search customer by phone

### Protected Routes (Auth Required)

#### Stats & Analytics
- **GET** `/api/v1/orders/stats` - Order statistics (OWNER, MANAGER only)
- **GET** `/api/v1/orders/revenue` - Revenue summary/dashboard (OWNER, MANAGER only)
- **GET** `/api/v1/orders/advanced-analytics` - Operational intelligence (OWNER, MANAGER only)

#### Order Management
- **GET** `/api/v1/orders` - List orders with filters (OWNER, MANAGER, WAITER)
- **POST** `/api/v1/orders` - Create internal order/manual order (OWNER, MANAGER, WAITER)
- **GET** `/api/v1/orders/:id` - Get single order details (OWNER, MANAGER, WAITER)
- **PATCH** `/api/v1/orders/:id/status` - Update order status (OWNER, MANAGER, WAITER)
- **PATCH** `/api/v1/orders/:id/payment` - Update payment details (OWNER, MANAGER, WAITER)
- **DELETE** `/api/v1/orders/:id` - Delete order (OWNER, MANAGER only)

#### Order Items
- **POST** `/api/v1/orders/:id/items` - Add items to order (OWNER, MANAGER, WAITER)
- **PATCH** `/api/v1/orders/:id/items/:itemId` - Update item quantity/notes (OWNER, MANAGER, WAITER)
- **DELETE** `/api/v1/orders/:id/items/:itemId` - Remove item from order (OWNER, MANAGER, WAITER)

#### QR Order Flow
- **POST** `/api/v1/orders/:id/accept` - Waiter accepts QR order (OWNER, MANAGER, WAITER)
- **POST** `/api/v1/orders/:id/reject` - Waiter rejects QR order (OWNER, MANAGER, WAITER)

#### Bills
- **GET** `/api/v1/orders/bills/today` - Daily bills (OWNER, MANAGER, WAITER)
- **GET** `/api/v1/orders/bills/table/:tableId` - Table final bill (OWNER, MANAGER, WAITER)

#### Credit Management
- **GET** `/api/v1/orders/analytics/udhaar` - Credit analytics list (OWNER, MANAGER only)
- **POST** `/api/v1/orders/analytics/settle` - Settle credit payment (OWNER, MANAGER only)

---

## 3. ORDER CREATION FORM/DIALOG

### Admin Order Creation Form
**Location:** [frontend/src/pages/admin/orders/CreateOrderDialog.tsx](frontend/src/pages/admin/orders/CreateOrderDialog.tsx)

#### Features:
- **Customer Details:** Name, Phone
- **Order Type:** DINE_IN, TAKEAWAY, DELIVERY
- **Table Selection:** Select table from dropdown (shows occupied tables)
- **Arrive At Time:** Optional datetime field
- **Product Selection:** Category filter + search products
- **Cart Management:** Add/remove items, adjust quantities
- **Notes:** Special instructions for kitchen
- **Kitchen Slip Printing:** Optional checkbox to print slip after creation

#### Form Fields:
```typescript
interface CreateOrderPayload {
  customer_name: string         // Required
  customer_phone: string        // Optional for internal orders
  table_id?: string             // Required for DINE_IN
  table_number?: string         // Optional
  notes?: string                // Max 500 chars
  source: "MANUAL"              // Fixed to MANUAL for staff orders
  order_type?: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  items: [
    {
      product_id: string        // UUID
      quantity: number          // 1-100
      notes?: string            // Item-level notes
    }
  ]
  arriveAt?: string             // For delivery/pickup
}
```

### Manual Order Dialog (Demo Store)
**Location:** [frontend/src/pages/admin/AddManualOrderDialog.tsx](frontend/src/pages/admin/AddManualOrderDialog.tsx)

#### Features:
- Simpler form for walk-in/phone customers
- Customer name & phone
- Order source selection (NEW, DINE_IN, TAKEAWAY, DELIVERY)
- Product search and selection
- Arrive time field
- Special instructions

---

## 4. ORDER DETAIL MODAL/DISPLAY COMPONENT

### Order Details Dialog
**Location:** [frontend/src/pages/admin/orders/OrderDetailsDialog.tsx](frontend/src/pages/admin/orders/OrderDetailsDialog.tsx)

#### Display Information:
- **Header:** Order number, timestamp, status badge
- **Items List:** 
  - Item name, quantity, unit price, total price
  - Individual item status (PENDING, COOKING, READY, SERVED, REORDER, CANCELLED)
- **Guest Information:**
  - Name, phone number
  - Total items count
- **Order Details:**
  - Source (QR, WEB, MANUAL, ZOMATO, SWIGGY)
  - Type (DINE_IN, TAKEAWAY, DELIVERY)
  - Station/Hall/Table info
- **Payment Section:**
  - Payment method
  - Payment status
  - Amount paid
  - Discount amount
  - Mark as paid button
  - Reverse payment option
- **Kitchen Slip Printing:** Print button

#### Status Styling:
```
PLACED: Blue
CONFIRMED: Purple
PREPARING: Orange
READY: Emerald
COMPLETED: Indigo
CANCELLED: Rose
```

---

## 5. ORDER VALIDATION SCHEMAS

**Location:** [backend/src/modules/orders/schema.ts](backend/src/modules/orders/schema.ts)

### Public Order Schema
```typescript
createPublicOrderSchema {
  customer_name: string (2-100 chars, trimmed)
  customer_phone: string (regex: +?[1-9]\d{9,14})
  table_number?: string (max 20 chars)
  notes?: string (max 500 chars)
  items: OrderItem[] (1-50 items)
  source: "QR" | "WEB" (default: "QR")
  table_id?: string (UUID, optional)
}
```

### Internal Order Schema
```typescript
createInternalOrderSchema {
  customer_name?: string (max 100 chars, optional)
  customer_phone?: string (optional, regex if provided)
  table_number?: string (max 20 chars)
  notes?: string (max 500 chars)
  items: OrderItem[] (1-50 items, min 1 required)
  source: "MANUAL" | "ZOMATO" | "SWIGGY" (default: "MANUAL")
  order_type?: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  table_id?: string (UUID, required if DINE_IN)
  arrive_at?: string (datetime)
}

// Validations:
// - DINE_IN orders MUST have table_id
// - Non-DINE_IN orders CANNOT have table_id
```

### OrderItem Schema
```typescript
orderItemSchema {
  product_id: string (UUID)
  quantity: number (1-100)
  notes?: string (max 200 chars)
}
```

### Payment Schema
```typescript
updatePaymentSchema {
  payment_method: PaymentMethod (CASH, CARD, UPI, CREDIT, GPAY, APPLE_PAY, OTHER)
  payment_status: "PENDING" | "PAID"
  payment_provider?: string (max 100 chars)
  payment_reference?: string (max 200 chars)
  payment_amount?: number (positive)
  discount_amount?: number (non-negative)
  paid_at?: string (ISO datetime)
}
```

---

## 6. ORDER CREATION BUSINESS LOGIC

**Location:** [backend/src/modules/orders/service.ts](backend/src/modules/orders/service.ts)

### Public Order Flow
1. **Find Restaurant** by slug
2. **Validate Products** - Check all product IDs exist and are active
3. **Find/Validate Table** - By UUID first, then by table_number
4. **Prevent Double-Booking** - Check no active orders exist on table
5. **Upsert Customer** - Find or create customer by phone
6. **Create Order** in transaction:
   - Generate unique order number (format: `#ord-XXXX`, 4 random digits)
   - Snapshot product prices at order time
   - Calculate total with applied discounts
   - Create order items with snapshots
   - Create relationship links (customer, table, hall, waiter)
7. **Broadcast QR Order** - Send Supabase Realtime notification to waiters

### Internal Order Flow (Staff)
1. **Validate Products** - Check all product IDs exist and are active
2. **Find Table** (if DINE_IN)
3. **Prevent Double-Booking** - Check no active orders on table
4. **Normalize Customer** - Default to "Guest" if no name, "N/A" if no phone
5. **Find Staff** - Link to waiter if user_id provided
6. **Create Order** - Same as public, but with:
   - `source: MANUAL/ZOMATO/SWIGGY`
   - Waiter assignment optional
   - No QR broadcast

---

## 7. ORDER FIELDS SUPPORTED

### Core Fields
- **Order Identification:** id, order_number, tenant_id, restaurant_id
- **Customer Info:** customer_name, customer_phone, customer_id
- **Table/Location:** table_id, table_number, hall_id, outlet_id
- **Order Details:**
  - notes (special instructions)
  - arrive_at (for delivery/future orders)
  - source (QR/WEB/MANUAL/ZOMATO/SWIGGY)
  - order_type (DINE_IN/TAKEAWAY/DELIVERY)
  - waiter_id (who took the order)

### Financial Fields
- **total_amount** - Calculated total (Decimal, 2 decimals)
- **discount_amount** - Applied discount (default 0)
- **payment_method** - CASH, CARD, UPI, CREDIT, GPAY, APPLE_PAY, OTHER
- **payment_status** - PENDING or PAID
- **payment_provider** - For card/digital payments
- **payment_reference** - Transaction ID
- **payment_amount** - Amount actually paid
- **paid_at** - Timestamp when payment completed

### Status Tracking Fields
- **status** - ACTIVE, COMPLETED, CANCELLED
- **placed_at** - Order creation time
- **confirmed_at** - When confirmed
- **preparing_at** - When kitchen started
- **ready_at** - When ready for pickup
- **completed_at** - When finished
- **cancelled_at** - When cancelled
- **cancel_reason** - Why order was cancelled

### Integration Fields
- **external_order_id** - Zomato/Swiggy order ID
- **external_metadata** - Raw webhook payload
- **gst_invoice** - Link to GST invoice

---

## 8. ADMIN PAGES & COMPONENTS

### Manager Orders Page
**Location:** [frontend/src/pages/manager/ManagerOrdersPage.tsx](frontend/src/pages/manager/ManagerOrdersPage.tsx)

#### Features:
- List all orders with pagination (limit 50)
- Filter by status (all/active/completed/cancelled)
- Filter by date range (from_date/to_date)
- Search by customer name/phone
- Category-based filtering
- Create new order button
- View order details modal
- Mark payment button
- Order status workflow

#### Dialogs:
- `CreateOrderDialog` - Create new order
- `OrderDetailsDialog` - View order information
- `MarkPaidDialog` - Mark order as paid

---

## 9. KEY BUSINESS RULES

### Table Occupancy
- ✅ Prevents double-booking (only 1 active order per table)
- ✅ Tables marked OCCUPIED when DINE_IN order placed
- ✅ Tables marked AVAILABLE when order COMPLETED
- ✅ Tables can be RESERVED (separate from orders)

### Order Numbers
- Unique per restaurant
- Format: `#ord-XXXX` (4 random digits)
- Generated using transaction to ensure uniqueness

### Discount Handling
- Applied at item level (via product discount_percent)
- Can also be applied at order level (discount_amount field)
- Final total = sum of items - discount_amount

### GST/Tax Support
- Snapshots GST rate at order time
- Tracks CGST, SGST, IGST amounts per item
- HSN/SAC codes captured for compliance

### Source Tracking
- QR: Customer ordered via QR code
- WEB: Customer ordered via website
- MANUAL: Staff created order
- ZOMATO/SWIGGY: From delivery platform integration

### Credit/Tab System
- Payment method can be "CREDIT"
- Allows customers to pay later
- Tracked via payment_status field

---

## 10. SUPER-ADMIN FRONTEND

**Location:** [super-admin-frontend/app/restaurants/page.tsx](super-admin-frontend/app/restaurants/page.tsx)

### Current Implementation:
- Shows order count badge per restaurant (`_count.orders`)
- NO detailed order management interface in super-admin
- Order management delegated to manager/waiter apps

### Status:
Super-admin platform does NOT have:
- ❌ Order creation form
- ❌ Order detail modal
- ❌ Order management pages
- ✅ Order metrics/counts only

---

## Summary

The order system is **fully functional** with:
- ✅ Complete schema supporting all order types and workflows
- ✅ Public and internal order creation APIs
- ✅ Item-level management (add/remove/modify)
- ✅ Payment tracking with multiple methods
- ✅ Status workflow (ACTIVE → COMPLETED/CANCELLED)
- ✅ Table occupancy management
- ✅ Integration support (Zomato/Swiggy)
- ✅ GST/Tax snapshot support
- ✅ Customer relationship management
- ✅ Comprehensive order details modal
- ✅ Staff order creation form with category/product search
