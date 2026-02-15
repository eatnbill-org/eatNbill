export type OrderSource = "new" | "zomato";
export type OrderStatus = "new" | "cooking" | "dining" | "ready" | "completed";
export type PaymentMethod = "cash" | "card" | "online" | "other";
export type AudienceSegment = "all" | "new" | "repeat" | "udhaar";
export type Template = 1 | 2 | 3;

export type Product = {
  id: number | string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  outOfStock?: boolean;
  costPrice?: number;
  isVeg?: boolean;
  discount_percent?: number;
};

export type OrderItem = {
  id: number | string;
  name: string;
  qty: number;
  price: number;
  discount_applied?: number;
};

export type Order = {
  id: string;
  source: OrderSource;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  specialInstructions?: string;
  consentWhatsapp?: boolean;
  arrivingAt?: string;
  receivedAt: string; // ISO
  cookingStartedAt: string | null;
  readyAt: string | null;
  paidAt: string | null;

  paymentMethod: PaymentMethod | null;
  isCredit: boolean;
  creditAmount: number;

  statusHistory: Array<{ at: string; status: OrderStatus; note?: string }>;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  firstVisit: string; // ISO
  lastVisit: string; // ISO
  favoriteItem: string;
  creditBalance: number;
  notes?: string;
};

export type CampaignSend = {
  id: string;
  name: string;
  message: string;
  template: 1 | 2 | 3;
  imageUrl?: string;
  productIds?: number[];

  audience: "all" | "new" | "repeat" | "udhaar";
  selectedContacts?: string[]; // manual selection (customer IDs)

  sentAt: string | null; // ISO
  scheduledFor: string | null; // ISO

  metrics: {
    sent: number;
    delivered: number;
    failed: number;
    clicks: number;
    engaged: number;
  };

  recipients: Array<{
    customerId: string;
    name: string;
    phone: string;
    status: "delivered" | "clicked" | "failed" | "pending";
    clickedAt?: string | null;
  }>;

  status: "completed" | "pending" | "sending" | "failed";
};

export type DemoStoreState = {
  products: Product[];
  todaysSpecial: { productId: number; label: string };
  orders: Order[];
  customers: Customer[];
  campaigns: CampaignSend[];

  ui: {
    demoBannerDismissed: boolean;
    adminSidebarOpen: boolean;
    lastPaymentMethod: PaymentMethod;
    adminPin: string;
  };
};
