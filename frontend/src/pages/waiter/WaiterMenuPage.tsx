/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, RefreshCw, Search, ShoppingCart } from "lucide-react";

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
import OrderTypeSelection, { type WaiterOrderType } from "@/components/OrderTypeSelection";
import { useCategoriesStore } from "@/stores/categories";
import type { OrderItem, Product } from "@/types/demo";
import { clamp, formatINR } from "@/lib/format";
import {
  addOrderItems,
  createOrder,
  fetchHalls,
  fetchOrderById,
  fetchProducts,
  fetchTables,
  updateTableStatus,
} from "@/lib/staff-api";
import CheckoutDialog from "@/pages/user/CheckoutDialog";
import ProductDetailModal from "@/pages/user/ProductDetailModal";

const CATEGORY_ICONS: Record<string, string> = {
  All: "🍽️",
  Bowls: "🍜",
  Burgers: "🍔",
  Wraps: "🌯",
  Drinks: "🥤",
  Snacks: "🍟",
  Rice: "🍚",
  Curry: "🍛",
  Desserts: "🍰",
  Starters: "🥗",
  Other: "🍴",
};

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  RESERVED: "bg-amber-50 text-amber-700 border-amber-200",
  OCCUPIED: "bg-rose-50 text-rose-700 border-rose-200",
};

const mapApiProductToDemo = (p: any, categoryName: string): Product => ({
  id: p.id,
  name: p.name,
  price: parseFloat(p.price),
  category: categoryName,
  imageUrl: p.images?.[0]?.public_url || undefined,
  outOfStock: !p.is_available && !p.is_active,
  costPrice: p.costprice ? parseFloat(p.costprice) : undefined,
  isVeg: p.is_veg,
  discount_percent: p.discount_percent ? parseFloat(p.discount_percent) : undefined,
});

function toOrderItem(p: Product, qty: number): OrderItem {
  return { id: p.id, name: p.name, price: p.price, qty };
}

export default function WaiterMenuPage() {
  const { categories, fetchCategories } = useCategoriesStore();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();

  const reorderId = orderId;
  const reorderTableId = searchParams.get("table");
  const isReorderMode = !!reorderId;

  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<string>("All");
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = React.useState(false);

  const [orderType, setOrderType] = React.useState<WaiterOrderType>("DINE_IN");
  const [selectedHallId, setSelectedHallId] = React.useState<string>("");
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
    setOrderType((existingOrder.order_type || "DINE_IN") as WaiterOrderType);
    if (existingOrder.table_id) {
      setSelectedTable(existingOrder.table_id);
    }
  }, [existingOrder, isReorderMode]);

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ["staff-products"],
    queryFn: fetchProducts,
  });

  const {
    data: tablesData,
    isLoading: tablesLoading,
    error: tablesError,
    refetch: refetchTables,
  } = useQuery({
    queryKey: ["staff-tables"],
    queryFn: fetchTables,
  });

  const {
    data: hallsData,
    isLoading: hallsLoading,
    error: hallsError,
    refetch: refetchHalls,
  } = useQuery({
    queryKey: ["staff-halls"],
    queryFn: fetchHalls,
  });

  const hallsList = Array.isArray(hallsData?.data) ? hallsData.data : [];
  const tablesList = Array.isArray(tablesData?.data) ? tablesData.data : [];

  React.useEffect(() => {
    if (!selectedHallId && hallsList.length > 0) {
      setSelectedHallId(hallsList[0].id);
    }
  }, [hallsList, selectedHallId]);

  const tablesForHall = React.useMemo(() => {
    return tablesList.filter((table: any) => table.is_active && table.hall_id === selectedHallId);
  }, [tablesList, selectedHallId]);

  const selectedTableData = React.useMemo(
    () => tablesList.find((table: any) => table.id === selectedTable),
    [tablesList, selectedTable]
  );

  const processedProducts = React.useMemo<Product[]>(() => {
    if (!productsData?.products) return [];

    return productsData.products.map((p: any) => {
      const cat = categories.find((c) => c.id === p.category_id);
      return mapApiProductToDemo(p, cat?.name || "Other");
    });
  }, [productsData, categories]);

  const items: OrderItem[] = React.useMemo(() => {
    const map = new Map<string, Product>(processedProducts.map((p: Product) => [String(p.id), p]));
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = map.get(id);
        if (!p) return null;
        return toOrderItem(p, qty);
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, processedProducts]);

  const add = (productId: string | number) =>
    setCart((c) => ({ ...c, [productId]: clamp((c[productId.toString()] ?? 0) + 1, 0, 99) }));

  const dec = (productId: string | number) =>
    setCart((c) => {
      const next = { ...c };
      const v = (next[productId.toString()] ?? 0) - 1;
      if (v <= 0) delete next[productId.toString()];
      else next[productId.toString()] = v;
      return next;
    });

  const displayCategories = React.useMemo(() => {
    const cats = categories
      .filter((c) => c.is_active)
      .map((c) => ({ name: c.name, image: c.image_url }));

    if (cats.length === 0) {
      const set = new Set(processedProducts.map((p: Product) => p.category || "Other"));
      return [
        { name: "All", image: null },
        ...Array.from(set)
          .sort()
          .map((name) => ({ name: name as string, image: null })),
      ];
    }

    return [{ name: "All", image: null }, ...cats];
  }, [categories, processedProducts]);

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

  const handleToggleTableReserve = async (
    table: any,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    try {
      if (table.table_status === "OCCUPIED") {
        toast.error("Occupied table cannot be changed manually");
        return;
      }
      const nextStatus = table.table_status === "RESERVED" ? "AVAILABLE" : "RESERVED";
      await updateTableStatus(table.id, nextStatus);
      toast.success(`Table ${table.table_number} set to ${nextStatus.toLowerCase()}`);
      refetchTables();
    } catch (error: any) {
      toast.error(error.message || "Failed to update table status");
    }
  };

  const handlePlaceOrder = async (payload: {
    customerName: string;
    customerPhone: string;
    specialInstructions: string;
  }) => {
    try {
      if (isReorderMode && reorderId) {
        await addOrderItems(
          reorderId,
          items.map((i) => ({
            product_id: i.id.toString(),
            quantity: i.qty,
            notes: payload.specialInstructions,
          }))
        );

        toast.success("Items added to order successfully!");
        setCart({});
        setCheckoutOpen(false);
        navigate("/waiter/orders");
        return;
      }

      if (orderType === "DINE_IN" && !selectedTable) {
        toast.error("Please select a table for dine-in order");
        return;
      }

      await createOrder({
        customer_name: payload.customerName || undefined,
        customer_phone: payload.customerPhone || undefined,
        order_type: orderType,
        table_id: orderType === "DINE_IN" ? selectedTable : undefined,
        hall_id: orderType === "DINE_IN" ? selectedTableData?.hall_id : undefined,
        items: items.map((i) => ({
          product_id: i.id.toString(),
          quantity: i.qty,
          notes: payload.specialInstructions,
        })),
        notes: payload.specialInstructions || undefined,
      });

      toast.success("Order placed successfully!");
      setCart({});
      setCheckoutOpen(false);
      navigate("/waiter/orders");
    } catch (error: any) {
      toast.error(error.message || "Failed to process order");
    }
  };

  if (productsLoading || tablesLoading || hallsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (productsError || tablesError || hallsError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <div className="bg-red-50 p-4 rounded-full">
          <RefreshCw className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Failed to load menu</h2>
        <p className="text-gray-500 max-w-md">There was a problem loading menu, halls, or tables.</p>
        <Button onClick={() => { refetchProducts(); refetchTables(); refetchHalls(); }} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 pb-24 rounded-xl">
      <div className={`sticky ${isReorderMode ? "top-14" : "top-0"} z-30 bg-white border-b border-slate-100 shadow-sm`}>
        <div className="px-4 py-3 space-y-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu..."
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-primary/20 focus:ring-primary/20 transition-all"
            />
          </div>

          {!isReorderMode && (
            <OrderTypeSelection
              value={orderType}
              onChange={(value) => {
                setOrderType(value);
                if (value !== "DINE_IN") {
                  setSelectedTable("");
                }
              }}
            />
          )}

          {orderType === "DINE_IN" && !isReorderMode && (
            <div className="space-y-2">
              <Select value={selectedHallId} onValueChange={setSelectedHallId}>
                <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Select hall" />
                </SelectTrigger>
                <SelectContent>
                  {hallsList.map((hall: any) => (
                    <SelectItem key={hall.id} value={hall.id}>{hall.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tablesForHall.map((table: any) => {
                  const occupied = table.table_status === "OCCUPIED";
                  const selected = selectedTable === table.id;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={occupied}
                      onClick={() => setSelectedTable(table.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${selected ? "border-primary bg-primary/5" : "border-slate-200 bg-white"} ${occupied ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900">Table {table.table_number}</p>
                          <p className="text-[11px] text-slate-500">{table.seats} seats</p>
                        </div>
                        <Badge className={`border ${STATUS_STYLES[table.table_status] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                          {table.table_status}
                        </Badge>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => handleToggleTableReserve(table, event)}
                          className="text-[11px] font-semibold text-slate-600 hover:text-primary"
                        >
                          {table.table_status === "RESERVED" ? "Set Available" : "Set Reserved"}
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="px-4">
        {displayCategories.length > 0 && (
          <div className="py-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 w-max">
              {displayCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActive(cat.name)}
                  className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${
                    active === cat.name
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-white border-2 border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-8 h-8 object-cover rounded-full" />
                  ) : (
                    <span className="text-2xl">{CATEGORY_ICONS[cat.name] || "🍴"}</span>
                  )}
                  <span className={`text-xs font-medium ${active === cat.name ? "text-primary" : "text-gray-600"}`}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3">All Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product: Product) => {
              const qty = cart[product.id.toString()] ?? 0;
              const isOutOfStock = Boolean(product.outOfStock);

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                >
                  <button
                    type="button"
                    className="relative w-full aspect-square overflow-hidden"
                    onClick={() => {
                      setSelectedProduct(product);
                      setProductModalOpen(true);
                    }}
                  >
                    <img src={product.imageUrl || "/placeholder-dish.jpg"} alt={product.name} className="h-full w-full object-cover" />
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded">OUT</span>
                      </div>
                    )}
                  </button>

                  <div className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                      <span className="text-sm font-bold text-primary shrink-0">{formatINR(product.price)}</span>
                    </div>

                    <div className="mt-2">
                      {qty === 0 ? (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => add(product.id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-xs font-medium">Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between px-2 py-1 rounded-lg border border-primary/20 bg-primary/5 shadow-inner">
                          <button type="button" onClick={() => dec(product.id)} className="h-7 w-7 rounded-full bg-white border flex items-center justify-center">−</button>
                          <span className="text-sm font-bold text-primary">{qty}</span>
                          <button type="button" onClick={() => add(product.id)} className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center">+</button>
                        </div>
                      )}
                    </div>
                  </div>
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

      {totalItems > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-white border-t shadow-lg">
          <div className="px-4 py-3 lg:max-w-4xl lg:mx-auto">
            <button
              type="button"
              onClick={() => {
                if (!isReorderMode && orderType === "DINE_IN" && !selectedTable) {
                  toast.error("Please select a table first");
                  return;
                }
                setCheckoutOpen(true);
              }}
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
                    {orderType === "DINE_IN"
                      ? `Table: ${selectedTableData?.table_number || "Not selected"}`
                      : orderType}
                  </p>
                </div>
              </div>
              <span className="text-lg font-bold">{formatINR(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      <ProductDetailModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={selectedProduct}
        quantity={selectedProduct ? (cart[selectedProduct.id.toString()] ?? 0) : 0}
        onAdd={() => selectedProduct && add(selectedProduct.id)}
        onDec={() => selectedProduct && dec(selectedProduct.id)}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={items}
        tableId={orderType === "DINE_IN" ? selectedTable : null}
        orderType={orderType}
        customerFieldsOptional={orderType !== "DINE_IN"}
        isWaiterMode={true}
        reorderContext={
          isReorderMode && existingOrder
            ? {
                orderNumber: existingOrder.order_number,
                customerName: existingOrder.customer_name,
                customerPhone: existingOrder.customer_phone,
                currentTotal: existingOrder.total_amount,
              }
            : undefined
        }
        onSubmit={handlePlaceOrder}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
