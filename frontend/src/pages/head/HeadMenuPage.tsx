/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, RefreshCw, Search, ShoppingCart, Check, X, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategoriesStore } from "@/stores/categories";
import type { OrderItem, Product } from "@/types/demo";
import { clamp, formatINR } from "@/lib/format";
import {
  addOrderItems,
  createOrder,
  fetchOrderById,
  fetchProducts,
  fetchTables,
  fetchStaffOrders,
} from "@/lib/staff-api";
import CheckoutDialog from "@/pages/user/CheckoutDialog";
import { WaiterLayoutSkeleton } from "@/components/ui/skeleton";

const mapApiProductToDemo = (p: any, categoryName: string): Product => ({
  id: p.id,
  name: p.name,
  price: parseFloat(p.price),
  category: categoryName,
  imageUrl: undefined, // ❌ NO IMAGES as per plan
  outOfStock: !p.is_active,
  costPrice: p.costprice ? parseFloat(p.costprice) : undefined,
  isVeg: p.is_veg,
  discount_percent: p.discount_percent ? parseFloat(p.discount_percent) : undefined,
});

function toOrderItem(p: Product, qty: number): OrderItem {
  return { id: p.id, name: p.name, price: p.price, qty };
}

export default function HeadMenuPage() {
  const { categories, fetchCategories } = useCategoriesStore();
  const navigate = useNavigate();
  const { orderId } = useParams(); // Get orderId from path segments
  const [searchParams] = useSearchParams();

  const reorderId = orderId;
  const reorderTableId = searchParams.get("table");
  const isReorderMode = !!reorderId;

  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<string>("All");
  const [selectedTable, setSelectedTable] = React.useState<string>(reorderTableId || "");

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const { data: existingOrderData } = useQuery({
    queryKey: ["order", reorderId],
    queryFn: () => fetchOrderById(reorderId!),
    enabled: isReorderMode,
  });
  const existingOrder = existingOrderData?.data || existingOrderData;

  React.useEffect(() => {
    if (!existingOrder) return;
    if (!isReorderMode) return;
    if (existingOrder.table_id) {
      setSelectedTable(existingOrder.table_id);
    }
  }, [existingOrder, isReorderMode]);

  // Fetch Products
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['staff-products'],
    queryFn: fetchProducts,
  });

  // Fetch Tables
  const {
    data: tablesData,
    isLoading: tablesLoading,
    error: tablesError,
    refetch: refetchTables
  } = useQuery({
    queryKey: ['staff-tables'],
    queryFn: fetchTables,
  });

  // Fetch Orders to check occupied tables
  const { data: ordersData } = useQuery({
    queryKey: ['staff-orders'],
    queryFn: fetchStaffOrders,
  });

  const tablesList = Array.isArray(tablesData?.data) ? tablesData.data : [];

  // ✅ Compute occupied tables from ACTIVE orders
  const occupiedTableIds = React.useMemo(() => {
    const orders = ordersData?.orders || [];
    return new Set(
      orders
        .filter((order: any) => order.status === 'ACTIVE')
        .map((order: any) => order.table_id)
        .filter(Boolean)
    );
  }, [ordersData]);

  // Process products into usable format
  const processedProducts = React.useMemo(() => {
    if (!productsData?.products) return [];

    return productsData.products.map((p: any) => {
      const cat = categories.find(c => c.id === p.category_id);
      return mapApiProductToDemo(p, cat?.name || 'Other');
    });
  }, [productsData, categories]);

  const items: OrderItem[] = React.useMemo(() => {
    const map = new Map(processedProducts.map((p: Product) => [p.id, p]));
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = map.get(id);
        if (!p) return null;
        return toOrderItem(p, qty);
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, processedProducts]);

  const add = (productId: string | number) => setCart((c) => ({ ...c, [productId]: clamp((c[productId.toString()] ?? 0) + 1, 0, 99) }));
  const dec = (productId: string | number) =>
    setCart((c) => {
      const next = { ...c };
      const v = (next[productId.toString()] ?? 0) - 1;
      if (v <= 0) delete next[productId.toString()];
      else next[productId.toString()] = v;
      return next;
    });

  // Get categories
  const displayCategories = React.useMemo(() => {
    const cats = categories.filter(c => c.is_active).map(c => ({
      name: c.name,
      image: c.image_url
    }));

    if (cats.length === 0) {
      const set = new Set(processedProducts.map((p: Product) => p.category || "Other"));
      return [{ name: "All", image: null }, ...Array.from(set).sort().map(name => ({ name: name as string, image: null }))];
    }

    return [{ name: "All", image: null }, ...cats];
  }, [categories, processedProducts]);

  // Filter products
  const filteredProducts = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return processedProducts.filter((p: Product) => {
      if (active !== "All" && (p.category || "Other") !== active) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [processedProducts, query, active]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.qty * i.price, 0);

  const handlePlaceOrder = async (payload: {
    customerName: string;
    customerPhone: string;
    specialInstructions: string;
  }) => {
    try {
      if (isReorderMode && reorderId) {
        // 🔄 Add items to existing order
        await addOrderItems(reorderId, items.map(i => ({
          product_id: i.id.toString(),
          quantity: i.qty,
          notes: payload.specialInstructions
        })));
        toast.success("Items added to order successfully!");
        setCart({});
        setCheckoutOpen(false);
        navigate("/head/orders");
      } else {
        // 🆕 Create new order
        const tableId =
          selectedTable && selectedTable !== "TAKEAWAY"
            ? selectedTable
            : undefined;
        await createOrder({
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          items: items.map(i => ({
            product_id: i.id.toString(),
            quantity: i.qty,
            notes: payload.specialInstructions // Apply notes to all for now, or simplistic approach
          })),
          table_id: tableId,
          notes: payload.specialInstructions
        });

        toast.success("Order placed successfully!");
        setCart({});
        setCheckoutOpen(false);
        navigate("/head/orders");
      }
    } catch (error: any) {
      console.error("Failed to process order:", error);
      toast.error(error.message || "Failed to process order");
    }
  };

  if (productsLoading || tablesLoading) {
    return <WaiterLayoutSkeleton />;
  }

  return (
    <div className="bg-slate-50 pb-24 rounded-xl">
      {/* 🔄 Reorder Mode Context Banner */}
      {isReorderMode && existingOrder && (
        <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 to-primary text-white shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <RefreshCw className="h-24 w-24 rotate-12" />
          </div>
          <div className="max-w-7xl mx-auto px-4 py-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <RefreshCw className="h-5 w-5 animate-spin-slow" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm tracking-wide">ADDING TO ORDER #{existingOrder.order_number}</h3>
                  <p className="text-[10px] uppercase font-medium opacity-80 flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    Table {existingOrder.table?.table_number || "Takeaway"} • Current Total: {formatINR(existingOrder.total_amount)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold h-6">
                  {totalItems} NEW ITEMS
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 text-xs font-bold rounded-lg"
                  onClick={() => navigate('/head/orders')}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Search & Table Selection */}
      <div className={`sticky ${isReorderMode ? 'top-14' : 'top-0'} z-30 bg-white border-b border-slate-100 shadow-sm`}>
        <div className="px-4 py-3">
          {/* Search (Left) and Table Selection (Right) */}
          <div className="flex items-center gap-3">
            {/* Left: Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search menu..."
                className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/20 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Right: Table Selection (Locked in Reorder Mode) */}
            <div className="w-48 shrink-0">
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={isReorderMode} // 🔒 Lock table in reorder mode
              >
                <SelectTrigger className={`h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/20 focus:ring-primary/20 ${isReorderMode ? 'opacity-70 grayscale' : ''}`}>
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl">
                  <SelectItem value="TAKEAWAY">Takeaway</SelectItem>
                  {tablesList.filter((t: any) => t.is_active).map((table: any) => {
                    const isOccupied = occupiedTableIds.has(table.id);
                    return (
                      <SelectItem
                        key={table.id}
                        value={table.id}
                        disabled={isOccupied}
                      >
                        {table.table_number ? table.table_number : table.name} {table.seats ? `(${table.seats} seats)` : ''} {isOccupied ? '(Occupied)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4">
        {/* 🆕 Simplified Category Tabs (Names Only) */}
        {displayCategories.length > 0 && (
          <div className="py-2 -mx-4 px-4 overflow-x-auto scrollbar-hide bg-white border-b border-slate-100">
            <div className="flex gap-2 w-max py-1">
              {displayCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActive(cat.name)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm ${active === cat.name
                    ? "bg-primary text-white scale-105"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid */}
        <section className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{active} Menu</h2>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-200">
              {filteredProducts.length} items
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product: Product) => {
              const qty = cart[product.id.toString()] ?? 0;
              const isOutOfStock = Boolean(product.outOfStock);

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && add(product.id)}
                  className={`relative bg-white rounded-2xl p-4 shadow-sm border-2 transition-all active:scale-95 cursor-pointer flex flex-col justify-between h-36 ${qty > 0
                    ? "border-primary ring-1 ring-primary/20 bg-primary/[0.02]"
                    : "border-slate-100 hover:border-slate-200"
                    } ${isOutOfStock ? "opacity-60 grayscale cursor-not-allowed" : ""}`}
                >
                  {/* Item Info */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">
                        {product.name}
                      </h3>
                      {product.isVeg !== undefined && (
                        <div className={`shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center ${product.isVeg ? "border-green-600" : "border-red-600"}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${product.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-black text-primary block mt-1">
                      {formatINR(product.price)}
                    </span>
                  </div>

                  {/* Action Area */}
                  <div className="flex items-center justify-between mt-auto">
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0 h-5">OUT OF STOCK</Badge>
                    ) : qty === 0 ? (
                      <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors border border-slate-100">
                        <Plus className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-white rounded-xl border border-primary/20 p-1 shadow-sm w-full justify-between" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); dec(product.id); }}
                          className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center active:bg-rose-100 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-black text-primary">{qty}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); add(product.id); }}
                          className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center active:bg-primary/90 shadow-sm shadow-primary/20"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Selection Glow */}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 flex items-center justify-center h-5 w-5 bg-primary rounded-full shadow-lg shadow-primary/30 animate-in zoom-in-50 duration-200">
                      <Check className="h-3 w-3 text-white stroke-[4px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">No products found.</p>
            </div>
          )}
        </section>
      </main>

      {/* Fixed Bottom Cart Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-white border-t shadow-lg">
          <div className="px-4 py-3 lg:max-w-4xl lg:mx-auto">
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 px-6 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center">
                    {totalItems}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium opacity-90">{totalItems} items</p>
                  <p className="text-xs opacity-75">
                    {selectedTable && selectedTable !== 'TAKEAWAY'
                      ? `Table: ${tablesList.find((t: any) => t.id === selectedTable)?.table_number || selectedTable}`
                      : 'Takeaway'}
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">{formatINR(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Dialog - Staff Mode */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={items}
        tableId={selectedTable}
        tables={tablesList}
        isWaiterMode={true}
        reorderContext={isReorderMode && existingOrder ? {
          orderNumber: existingOrder.order_number,
          customerName: existingOrder.customer_name,
          customerPhone: existingOrder.customer_phone,
          currentTotal: existingOrder.total_amount
        } : undefined}
        onSubmit={handlePlaceOrder}
        onTableChange={(tableId) => setSelectedTable(tableId)}
      />
    </div>
  );
}
