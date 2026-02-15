import * as React from "react";
import type { Customer, CampaignSend, DemoStoreState, Order, OrderStatus, PaymentMethod, Product } from "@/types/demo";
import { seedState } from "@/data/seed";

const STORAGE_KEY = "arabian-nights:demo:v1";

// --- TYPES ---
export type CustomerTheme = 'classic' | 'modern' | 'minimal' | 'grid' | 'dark' | 'slider';

// ✅ NEW: Admin Control Preferences
export interface AdminPreferences {
  sidebar: {
    showCampaigns: boolean;
    showCustomers: boolean;
  };
  dashboardFields: {
    showName: boolean;
    showNumber: boolean;
    showArriveAt: boolean;
    showSource: boolean;
    showSpecialInstructions: boolean;
  };
  alerts: {
    [key: string]: { enabled: boolean; customSound?: string }; // Key: zomato, swiggy, etc.
  };
}

export interface CustomerSettings {
  activeTheme: CustomerTheme;
  requireCustomerDetails: boolean;
  enablePreOrder: boolean;
  showProductDemand: boolean;
  storeName: string;
  storeLogo?: string;
  bannerImage?: string;
}

export interface CompanyProfile {
  name: string; email: string; phone: string; address: string; city: string; zip: string; gstin: string; website: string; restaurantType: string;
}

export interface StaffMember {
  id: string; name: string; role: string; phone: string; active: boolean; joinedAt: string; image?: string; salary: string; shift: string;
}

export interface Table {
  id: string; name: string; type: 'AC' | 'Non-AC' | 'Outdoor'; capacity: number; active: boolean;
}


// Default Initial State (Updated)
const initialState: ExtendedDemoState = {
  customerSettings: {
    activeTheme: 'modern',
    requireCustomerDetails: true,
    enablePreOrder: true,
    showProductDemand: true,
    storeName: "Loading...",
    storeLogo: "",
    bannerImage: "",
  },
  company: {
    name: "", email: "", phone: "", address: "", city: "", zip: "", gstin: "", website: "", restaurantType: "Multi-Cuisine"
  },
  adminPreferences: {
    sidebar: { showCampaigns: true, showCustomers: true },
    dashboardFields: {
      showName: true, showNumber: true, showArriveAt: true, showSource: true, showSpecialInstructions: true
    },
    alerts: {
      zomato: { enabled: true },
      swiggy: { enabled: true },
      walkin: { enabled: true },
      reorder: { enabled: true },
      stock: { enabled: true }
    }
  },
  staff: [],
  tables: [],
  products: [],
  orders: [],
  customers: [],
  campaigns: [],
  cart: [],
  currentTable: null,
  ui: { adminPin: "1234", demoBannerDismissed: false, adminSidebarOpen: true, lastPaymentMethod: "cash" },
  todaysSpecial: { productId: 0, label: "Today's Special" }
};

// ✅ EXTENDED STATE
export interface ExtendedDemoState extends DemoStoreState {
  customerSettings: CustomerSettings;
  company: CompanyProfile;
  adminPreferences: AdminPreferences; // ✅ Added this
  staff: StaffMember[];
  tables: Table[];
  cart: { productId: number; qty: number }[];
  currentTable: string | null;
}

function freshSeedState(): ExtendedDemoState {
  const base = JSON.parse(JSON.stringify(seedState)) as DemoStoreState;
  return {
    ...base,
    customerSettings: {
      activeTheme: 'modern',
      requireCustomerDetails: true,
      enablePreOrder: true,
      showProductDemand: true,
      storeName: "Arabian Nights",
      storeLogo: "",
      bannerImage: "",
    },
    company: {
      name: "Arabian Nights",
      email: "contact@arabiannights.in",
      phone: "+91 98765 43210",
      address: "Shop 12, Food Street",
      city: "Gujarat",
      zip: "388001",
      gstin: "",
      website: "",
      restaurantType: "Multi-Cuisine"
    },
    // ✅ Default Admin Preferences
    adminPreferences: {
      sidebar: { showCampaigns: true, showCustomers: true },
      dashboardFields: { showName: true, showNumber: true, showArriveAt: true, showSource: true, showSpecialInstructions: true },
      alerts: {
        zomato: { enabled: true },
        swiggy: { enabled: true },
        walkin: { enabled: true },
        reorder: { enabled: true },
        stock: { enabled: true }
      }
    },
    staff: [],
    tables: [{ id: "T1", name: "T-1", type: "AC", capacity: 4, active: true }],
    cart: [],
    currentTable: null,
  };
}

type DemoActions =
  | { type: "RESET" }
  | { type: "DISMISS_BANNER" }
  | { type: "TOGGLE_STOCK"; productId: number }
  | { type: "SET_TODAYS_SPECIAL"; productId: number; label: string }
  | { type: "UPDATE_PRODUCT"; productId: number; patch: Partial<Pick<Product, "name" | "price" | "category" | "imageUrl" | "outOfStock" | "isVeg" | "costPrice">> }
  | { type: "DELETE_PRODUCT"; productId: number }
  | { type: "ADD_PRODUCT"; payload: Pick<Product, "name" | "price" | "category"> & { imageUrl?: string; isVeg?: boolean; costPrice?: number } }
  | { type: "SET_ADMIN_PIN"; pin: string }
  | { type: "SEND_CAMPAIGN"; payload: CampaignSend }
  | { type: "PLACE_ORDER"; payload: Omit<Order, "statusHistory" | "total"> & { tableId?: string } }
  | { type: "UPDATE_ORDER_STATUS"; orderId: string; status: OrderStatus; at: string; note?: string }
  | { type: "SET_PAYMENT"; orderId: string; at: string; method: PaymentMethod; isCredit: boolean; creditAmount: number }
  | { type: "MARK_CREDIT_PAID"; phone: string; amount: number; at: string }
  | { type: "UPSERT_CUSTOMER_NOTE"; phone: string; notes: string }
  | { type: "UPDATE_CUSTOMER_SETTINGS"; payload: Partial<CustomerSettings> }
  | { type: "CART_ADD"; productId: number }
  | { type: "CART_REMOVE"; productId: number }
  | { type: "CART_CLEAR" }
  | { type: "UPDATE_COMPANY"; payload: Partial<CompanyProfile> }
  | { type: "ADD_STAFF"; payload: Omit<StaffMember, "id" | "joinedAt" | "active"> }
  | { type: "UPDATE_STAFF"; id: string; payload: Partial<StaffMember> }
  | { type: "TOGGLE_STAFF"; id: string }
  | { type: "DELETE_STAFF"; id: string }
  | { type: "ADD_TABLE"; payload: Omit<Table, "id" | "active"> }
  | { type: "UPDATE_TABLE"; id: string; payload: Partial<Table> }
  | { type: "DELETE_TABLE"; id: string }
  | { type: "SET_CURRENT_TABLE"; tableId: string }
  // ✅ NEW ACTION
  | { type: "UPDATE_ADMIN_PREFS"; payload: Partial<AdminPreferences> };

function normalizeLoadedState(raw: any): ExtendedDemoState {
  const base = freshSeedState();
  const next: ExtendedDemoState = {
    ...base,
    ...(raw && typeof raw === "object" ? raw : {}),
    customerSettings: { ...base.customerSettings, ...(raw?.customerSettings || {}) },
    company: { ...base.company, ...(raw?.company || {}) },
    // ✅ Merge Admin Preferences
    adminPreferences: {
      sidebar: { ...base.adminPreferences.sidebar, ...(raw?.adminPreferences?.sidebar || {}) },
      dashboardFields: { ...base.adminPreferences.dashboardFields, ...(raw?.adminPreferences?.dashboardFields || {}) },
      alerts: { ...base.adminPreferences.alerts, ...(raw?.adminPreferences?.alerts || {}) }
    },
    staff: Array.isArray(raw?.staff) ? raw.staff : base.staff,
    tables: Array.isArray(raw?.tables) ? raw.tables : base.tables,
    cart: Array.isArray(raw?.cart) ? raw.cart : [],
    currentTable: raw?.currentTable || null,
    ui: { ...base.ui, ...(raw?.ui || {}) },
    products: Array.isArray(raw?.products) ? raw.products : base.products,
    orders: Array.isArray(raw?.orders) ? raw.orders : base.orders,
    customers: Array.isArray(raw?.customers) ? raw.customers : base.customers,
    campaigns: Array.isArray(raw?.campaigns) ? raw.campaigns : base.campaigns,
    todaysSpecial: raw?.todaysSpecial || base.todaysSpecial
  };
  return next;
}

// Helpers... (Same as before)
function computeOrderTotal(items: { qty: number; price: number }[]) { return items.reduce((s, i) => s + i.qty * i.price, 0); }
function normalizePhone(phone: string) { return phone.replace(/\s+/g, "").trim(); }
function favoriteItemFromOrders(orders: Order[]) { return "Chicken Wrap"; }
function upsertCustomerFromOrder(state: ExtendedDemoState, order: Order): Customer[] {
  const phone = normalizePhone(order.customerPhone);
  const now = order.receivedAt;
  const existing = state.customers.find((c) => normalizePhone(c.phone) === phone);
  if (!existing) {
    return [{
      id: `C-${String(state.customers.length + 1).padStart(3, "0")}`,
      name: order.customerName, phone: phone, totalOrders: 1, totalSpent: order.total,
      firstVisit: now, lastVisit: now, favoriteItem: "New", creditBalance: order.isCredit ? order.total : 0,
    }, ...state.customers];
  }
  return state.customers;
}

function reducer(state: ExtendedDemoState, action: DemoActions): ExtendedDemoState {
  switch (action.type) {
    case "RESET": return freshSeedState();
    // ... (Keep ALL existing reducers for Products, Orders, Staff, Tables, etc. SAME AS BEFORE) ...
    case "DISMISS_BANNER": return { ...state, ui: { ...state.ui, demoBannerDismissed: true } };
    case "TOGGLE_STOCK": return { ...state, products: state.products.map((p) => (p.id === action.productId ? { ...p, outOfStock: !p.outOfStock } : p)) };
    case "SET_TODAYS_SPECIAL": return { ...state, todaysSpecial: { productId: action.productId, label: action.label } };
    case "UPDATE_PRODUCT": return { ...state, products: state.products.map((p) => (p.id === action.productId ? { ...p, ...action.patch } : p)) };
    case "DELETE_PRODUCT": return { ...state, products: state.products.filter((p) => p.id !== action.productId) };
    case "ADD_PRODUCT": { const nextId = state.products.reduce((m, p) => Math.max(m, p.id), 0) + 1; return { ...state, products: [...state.products, { id: nextId, name: action.payload.name, price: action.payload.price, costPrice: action.payload.costPrice ?? 0, category: action.payload.category, imageUrl: action.payload.imageUrl, outOfStock: false, isVeg: action.payload.isVeg ?? true }] }; }
    case "SET_ADMIN_PIN": return { ...state, ui: { ...state.ui, adminPin: action.pin } };
    case "SEND_CAMPAIGN": return { ...state, campaigns: [action.payload, ...state.campaigns] };

    case "PLACE_ORDER": {
      const total = computeOrderTotal(action.payload.items);
      let tableName = undefined;
      if (action.payload.tableId) {
        const table = state.tables.find(t => t.id === action.payload.tableId);
        if (table) tableName = table.name;
      }
      let finalName = action.payload.customerName;
      if (tableName) {
        if (!finalName || finalName === "Guest") finalName = `${tableName} (Guest)`;
        else finalName = `${finalName} • ${tableName}`;
      }
      const order: Order = {
        ...action.payload,
        customerName: finalName,
        customerPhone: normalizePhone(action.payload.customerPhone),
        total,
        statusHistory: [{ at: action.payload.receivedAt, status: action.payload.status, note: `Order placed via ${tableName || 'Counter'}` }],
        arrivingAt: (action.payload as any).arrivingAt,
        // @ts-ignore
        tableId: action.payload.tableId
      };
      return { ...state, orders: [order, ...state.orders], customers: upsertCustomerFromOrder(state, order), cart: [] };
    }

    case "UPDATE_ORDER_STATUS": return { ...state, orders: state.orders.map((o) => o.id === action.orderId ? { ...o, status: action.status, statusHistory: [...o.statusHistory, { at: action.at, status: action.status, note: action.note }] } : o) };
    case "SET_PAYMENT": { const { orderId, at, method, isCredit, creditAmount } = action; return { ...state, ui: { ...state.ui, lastPaymentMethod: method }, orders: state.orders.map((o) => o.id !== orderId ? o : { ...o, isCredit, creditAmount: isCredit ? Math.max(0, creditAmount || o.total) : 0, paymentMethod: method, paidAt: isCredit ? null : at, status: isCredit ? o.status : "completed" }), customers: state.customers.map(c => c) }; }
    case "MARK_CREDIT_PAID": return { ...state, customers: state.customers.map((c) => normalizePhone(c.phone) === normalizePhone(action.phone) ? { ...c, creditBalance: Math.max(0, c.creditBalance - action.amount) } : c) };
    case "UPSERT_CUSTOMER_NOTE": return { ...state, customers: state.customers.map((c) => (normalizePhone(c.phone) === normalizePhone(action.phone) ? { ...c, notes: action.notes } : c)) };
    case "UPDATE_CUSTOMER_SETTINGS": return { ...state, customerSettings: { ...state.customerSettings, ...action.payload } };
    case "CART_ADD": { const existing = state.cart.find(i => i.productId === action.productId); if (existing) return { ...state, cart: state.cart.map(i => i.productId === action.productId ? { ...i, qty: i.qty + 1 } : i) }; return { ...state, cart: [...state.cart, { productId: action.productId, qty: 1 }] }; }
    case "CART_REMOVE": { const existing = state.cart.find(i => i.productId === action.productId); if (existing && existing.qty > 1) return { ...state, cart: state.cart.map(i => i.productId === action.productId ? { ...i, qty: i.qty - 1 } : i) }; return { ...state, cart: state.cart.filter(i => i.productId !== action.productId) }; }
    case "CART_CLEAR": return { ...state, cart: [] };
    case "UPDATE_COMPANY": return { ...state, company: { ...state.company, ...action.payload } };
    case "ADD_STAFF": return { ...state, staff: [...state.staff, { id: `S-${Math.floor(Math.random() * 10000)}`, ...action.payload, active: true, joinedAt: new Date().toISOString() }] };
    case "UPDATE_STAFF": return { ...state, staff: state.staff.map(s => s.id === action.id ? { ...s, ...action.payload } : s) };
    case "TOGGLE_STAFF": return { ...state, staff: state.staff.map(s => s.id === action.id ? { ...s, active: !s.active } : s) };
    case "DELETE_STAFF": return { ...state, staff: state.staff.filter(s => s.id !== action.id) };
    case "ADD_TABLE": return { ...state, tables: [...state.tables, { id: `T-${Math.floor(Math.random() * 10000)}`, ...action.payload, active: true }] };
    case "UPDATE_TABLE": return { ...state, tables: state.tables.map(t => t.id === action.id ? { ...t, ...action.payload } : t) };
    case "DELETE_TABLE": return { ...state, tables: state.tables.filter(t => t.id !== action.id) };
    case "SET_CURRENT_TABLE": return { ...state, currentTable: action.tableId };

    // ✅ NEW: Update Admin Preferences
    case "UPDATE_ADMIN_PREFS":
      return {
        ...state,
        adminPreferences: {
          ...state.adminPreferences,
          ...action.payload,
          sidebar: { ...state.adminPreferences.sidebar, ...(action.payload.sidebar || {}) },
          dashboardFields: { ...state.adminPreferences.dashboardFields, ...(action.payload.dashboardFields || {}) },
          alerts: { ...state.adminPreferences.alerts, ...(action.payload.alerts || {}) }
        }
      };

    default: return state;
  }
}

// ... Context Provider (Same as before)
type DemoStoreContextValue = { state: ExtendedDemoState; dispatch: React.Dispatch<DemoActions>; resetDemo: () => void; clearDemoStorage: () => void; };
const DemoStoreContext = React.createContext<any>(null);

function safeParse(json: string | null): ExtendedDemoState | null {
  if (!json) return null;
  try { return normalizeLoadedState(JSON.parse(json)); } catch { return null; }
}

export function DemoStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "") || freshSeedState(); } catch { return freshSeedState(); }
  });
  React.useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const resetDemo = () => dispatch({ type: "RESET" });
  const clearDemoStorage = () => { localStorage.removeItem(STORAGE_KEY); dispatch({ type: "RESET" }); };

  return <DemoStoreContext.Provider value={{ state, dispatch, resetDemo, clearDemoStorage }}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() { return React.useContext(DemoStoreContext); }
export function makeOrderId() { return `ORD-${Math.floor(Math.random() * 10000)}`; }