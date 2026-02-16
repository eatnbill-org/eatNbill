/**
 * Staff menu page - Menu for staff to take orders with table selection
 */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategoriesStore } from "@/stores/categories";
import type { OrderItem, Product } from "@/types/demo";
import { formatINR, clamp } from "@/lib/format";
import CheckoutDialog from "@/pages/user/CheckoutDialog";
import ProductDetailModal from "@/pages/user/ProductDetailModal";
import { Search, Plus, ShoppingCart, MapPin, Loader2, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchTables, createOrder, fetchOrderById, addOrderItems } from "@/lib/staff-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Category icons mapping
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

// Helper to map API product to Demo product (for compatibility)
const mapApiProductToDemo = (p: any, categoryName: string): Product => ({
    id: p.id,
    name: p.name,
    price: parseFloat(p.price),
    category: categoryName,
    imageUrl: p.images?.[0]?.public_url || undefined,
    outOfStock: !p.is_available && !p.is_active, // heuristic
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
    const { orderId } = useParams(); // Get orderId from path segments
    const [searchParams] = useSearchParams();

    // 🔄 Reorder Context
    const reorderId = orderId;
    const reorderTableId = searchParams.get('table');
    const isReorderMode = !!reorderId;

    React.useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const [cart, setCart] = React.useState<Record<string, number>>({});
    const [checkoutOpen, setCheckoutOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState<string>("All");
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
    const [productModalOpen, setProductModalOpen] = React.useState(false);

    // Table selection for staff
    const [selectedTable, setSelectedTable] = React.useState<string>(reorderTableId || "TAKEAWAY");

    // Fetch Existing Order for Reorder Mode
    const { data: existingOrderData } = useQuery({
        queryKey: ['order', reorderId],
        queryFn: () => fetchOrderById(reorderId!),
        enabled: isReorderMode,
    });

    const existingOrder = existingOrderData?.data || existingOrderData;



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
                navigate("/waiter/orders");
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
                navigate("/waiter/orders");
            }
        } catch (error: any) {
            console.error("Failed to process order:", error);
            toast.error(error.message || "Failed to process order");
        }
    };

    if (productsLoading || tablesLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (productsError || tablesError) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 text-center px-4">
                <div className="bg-red-50 p-4 rounded-full">
                    <RefreshCw className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Failed to load menu</h2>
                <p className="text-gray-500 max-w-md">There was a problem loading the menu or tables. Please try again.</p>
                <Button
                    onClick={() => { refetchProducts(); refetchTables(); }}
                    variant="outline"
                >
                    Retry
                </Button>
            </div>
        );
    }

    // Safely get tables array
    const tablesList = Array.isArray(tablesData?.data) ? tablesData.data : (Array.isArray(tablesData) ? tablesData : []);

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
                                    onClick={() => navigate('/waiter/orders')}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="h-1 bg-white/20 w-full overflow-hidden">
                        <div className="h-full bg-white/40 animate-progress"></div>
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
                                    {tablesList.filter((t: any) => t.is_active).map((table: any) => (
                                        <SelectItem key={table.id} value={table.id}>
                                            {table.table_number ? table.table_number : table.name} {table.seats ? `(${table.seats} seats)` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <main className="px-4">
                {/* Category Tabs */}
                {displayCategories.length > 0 && (
                    <div className="py-4 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-3 w-max">
                            {displayCategories.map((cat) => (
                                <button
                                    key={cat.name}
                                    type="button"
                                    onClick={() => setActive(cat.name)}
                                    className={`flex flex-col items-center gap-1.5 px-4 py-2 rounded-2xl transition-all ${active === cat.name
                                        ? "bg-primary/10 border-2 border-primary"
                                        : "bg-white border-2 border-gray-100 hover:border-gray-200"
                                        }`}
                                >
                                    {cat.image ? (
                                        <img
                                            src={cat.image}
                                            alt={cat.name}
                                            className="w-8 h-8 object-cover rounded-full"
                                        />
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



                {/* Products Grid */}
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

            {/* Fixed Bottom Cart Bar */}
            {totalItems > 0 && (
                <div className="fixed bottom-16 left-0 right-0 z-50 bg-white border-t shadow-lg">
                    <div className="px-4 py-3 lg:max-w-4xl lg:mx-auto">
                        <button
                            type="button"
                            onClick={() => setCheckoutOpen(true)}
                            disabled={false}
                            className="w-full bg-primary hover:bg-primary/90 disabled:bg-gray-400 text-white rounded-2xl py-4 px-6 flex items-center justify-between transition-colors"
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
                                        {selectedTable && selectedTable !== "TAKEAWAY"
                                            ? `Table: ${tablesList.find((t: any) => t.id === selectedTable)?.table_number || selectedTable}`
                                            : "Takeaway"}
                                    </p>
                                </div>
                            </div>
                            <span className="text-lg font-bold">{formatINR(totalPrice)}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Product Detail Modal */}
            <ProductDetailModal
                open={productModalOpen}
                onOpenChange={setProductModalOpen}
                product={selectedProduct}
                quantity={selectedProduct ? (cart[selectedProduct.id.toString()] ?? 0) : 0}
                onAdd={() => selectedProduct && add(selectedProduct.id)}
                onDec={() => selectedProduct && dec(selectedProduct.id)}
            />

            {/* Checkout Dialog - Staff Mode */}
            <CheckoutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                items={items}
                tableId={selectedTable}
                isWaiterMode={true}
                reorderContext={isReorderMode && existingOrder ? {
                    orderNumber: existingOrder.order_number,
                    customerName: existingOrder.customer_name,
                    customerPhone: existingOrder.customer_phone,
                    currentTotal: existingOrder.total_amount
                } : undefined}
                onSubmit={handlePlaceOrder}
            />

            <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}
