import wrapImg from "@/assets/products/chicken-wrap.jpg";
import popcornImg from "@/assets/products/chicken-popcorn.jpg";
import bowlImg from "@/assets/products/chicken-bowl.jpg";
import burgerImg from "@/assets/products/chicken-burger.jpg";
import sandwichImg from "@/assets/products/chicken-sandwich.jpg";

import type { Customer, DemoStoreState, Order, PaymentMethod, Product } from "@/types/demo";

function iso(date: Date) {
  return date.toISOString();
}

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60_000);
}

const products: Product[] = [
  { id: 1, name: "Chicken Wrap", price: 120, category: "Wraps", imageUrl: wrapImg },
  { id: 2, name: "Chicken Popcorn", price: 140, category: "Snacks", imageUrl: popcornImg },
  { id: 3, name: "Chicken Bowl", price: 150, category: "Bowls", imageUrl: bowlImg },
  { id: 4, name: "Chicken Burger", price: 110, category: "Burgers", imageUrl: burgerImg },
  { id: 5, name: "Chicken Sandwich", price: 80, category: "Sandwiches", imageUrl: sandwichImg },
];

function orderTotal(items: { qty: number; price: number }[]) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}

function makeOrder(partial: Omit<Order, "total" | "statusHistory"> & { statusHistory?: Order["statusHistory"] }): Order {
  const total = orderTotal(partial.items);
  return {
    ...partial,
    total,
    statusHistory:
      partial.statusHistory ??
      [{ at: partial.receivedAt, status: partial.status, note: "Order received" }],
  };
}

const mockOrders: Order[] = [
  makeOrder({
    id: "ORD-001",
    source: "new",
    customerName: "Raj Kumar",
    customerPhone: "+91-9876543210",
    items: [
      { id: 1, name: "Chicken Wrap", qty: 2, price: 120 },
      { id: 2, name: "Chicken Popcorn", qty: 1, price: 140 },
    ],
    status: "new",
    specialInstructions: "No spices",
    consentWhatsapp: true,
    receivedAt: iso(minutesAgo(6)),
    cookingStartedAt: null,
    readyAt: null,
    paidAt: null,
    paymentMethod: null,
    isCredit: false,
    creditAmount: 0,
  }),
  makeOrder({
    id: "ORD-002",
    source: "zomato",
    customerName: "Aisha",
    customerPhone: "+91-9000012345",
    items: [
      { id: 3, name: "Chicken Bowl", qty: 1, price: 150 },
      { id: 2, name: "Chicken Popcorn", qty: 1, price: 140 },
    ],
    status: "cooking",
    specialInstructions: "Extra crispy",
    consentWhatsapp: false,
    receivedAt: iso(minutesAgo(42)),
    cookingStartedAt: iso(minutesAgo(35)),
    readyAt: null,
    paidAt: null,
    paymentMethod: null,
    isCredit: false,
    creditAmount: 0,
    statusHistory: [
      { at: iso(minutesAgo(42)), status: "new" },
      { at: iso(minutesAgo(35)), status: "cooking", note: "Cooking started" },
    ],
  }),
  makeOrder({
    id: "ORD-003",
    source: "new",
    customerName: "Suresh",
    customerPhone: "+91-9111122222",
    items: [
      { id: 4, name: "Chicken Burger", qty: 2, price: 110 },
      { id: 5, name: "Chicken Sandwich", qty: 1, price: 80 },
    ],
    status: "ready",
    specialInstructions: "",
    consentWhatsapp: true,
    receivedAt: iso(minutesAgo(28)),
    cookingStartedAt: iso(minutesAgo(23)),
    readyAt: iso(minutesAgo(5)),
    paidAt: null,
    paymentMethod: null,
    isCredit: true,
    creditAmount: 300,
    statusHistory: [
      { at: iso(minutesAgo(28)), status: "new" },
      { at: iso(minutesAgo(23)), status: "cooking" },
      { at: iso(minutesAgo(5)), status: "ready", note: "Marked ready" },
    ],
  }),
  makeOrder({
    id: "ORD-004",
    source: "zomato",
    customerName: "Neha",
    customerPhone: "+91-9888877777",
    items: [{ id: 1, name: "Chicken Wrap", qty: 1, price: 120 }],
    status: "completed",
    specialInstructions: "",
    consentWhatsapp: false,
    receivedAt: iso(minutesAgo(90)),
    cookingStartedAt: iso(minutesAgo(84)),
    readyAt: iso(minutesAgo(72)),
    paidAt: iso(minutesAgo(70)),
    paymentMethod: "online" satisfies PaymentMethod,
    isCredit: false,
    creditAmount: 0,
    statusHistory: [
      { at: iso(minutesAgo(90)), status: "new" },
      { at: iso(minutesAgo(84)), status: "cooking" },
      { at: iso(minutesAgo(72)), status: "ready" },
      { at: iso(minutesAgo(70)), status: "completed", note: "Paid" },
    ],
  }),
];

const mockCustomers: Customer[] = [
  {
    id: "C-001",
    name: "Raj Kumar",
    phone: "+91-9876543210",
    totalOrders: 15,
    totalSpent: 4500,
    firstVisit: iso(new Date("2025-01-01T10:00:00.000Z")),
    lastVisit: iso(minutesAgo(6)),
    creditBalance: 500,
    favoriteItem: "Chicken Wrap",
    notes: "Prefers mild spice.",
  },
  {
    id: "C-002",
    name: "Aisha",
    phone: "+91-9000012345",
    totalOrders: 3,
    totalSpent: 820,
    firstVisit: iso(new Date("2025-01-12T09:30:00.000Z")),
    lastVisit: iso(minutesAgo(42)),
    creditBalance: 0,
    favoriteItem: "Chicken Popcorn",
  },
  {
    id: "C-003",
    name: "Suresh",
    phone: "+91-9111122222",
    totalOrders: 8,
    totalSpent: 2150,
    firstVisit: iso(new Date("2025-01-04T12:10:00.000Z")),
    lastVisit: iso(minutesAgo(28)),
    creditBalance: 300,
    favoriteItem: "Chicken Burger",
  },
];

export const seedState: DemoStoreState = {
  products,
  todaysSpecial: { productId: 2, label: "10% OFF TODAY" },
  orders: mockOrders,
  customers: mockCustomers,
  campaigns: [],
  ui: {
    demoBannerDismissed: false,
    adminSidebarOpen: true,
    lastPaymentMethod: "cash",
    adminPin: "123456",
  },
};
