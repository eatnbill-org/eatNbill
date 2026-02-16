import { fetchProducts, fetchCategories } from "@/lib/staff-api";
import { formatINR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search, Loader2, RefreshCw, Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { useQuery } from "@tanstack/react-query";

export default function WaiterStockPage() {
    const [query, setQuery] = React.useState("");
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

    // Fetch products from API
    const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
        queryKey: ['staff-products'],
        queryFn: fetchProducts,
        refetchInterval: 30000,
    });

    // Fetch categories from API
    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ['staff-categories'],
        queryFn: fetchCategories,
    });

    const products = productsData?.products || [];
    const categories = categoriesData?.data || [];

    // Filter products by search and category
    const filteredProducts = React.useMemo(() => {
        let result = products;

        // Search filter
        const q = query.trim().toLowerCase();
        if (q) {
            result = result.filter((p: any) =>
                p.name.toLowerCase().includes(q) ||
                p.category?.name?.toLowerCase().includes(q)
            );
        }

        // Category filter
        if (selectedCategoryId) {
            result = result.filter((p: any) => p.category_id === selectedCategoryId);
        }

        return result;
    }, [products, query, selectedCategoryId]);

    // Count stats
    const inStockCount = products.filter((p: any) => p.is_available).length;
    const outOfStockCount = products.filter((p: any) => !p.is_available).length;

    // Loading state
    if (productsLoading || categoriesLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Error state
    if (productsError) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">Failed to load products. Please try again.</p>
                <Button onClick={() => refetchProducts()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-2xl font-bold text-slate-900">{inStockCount}</p>
                    <p className="text-xs text-slate-500">In Stock</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <p className="text-2xl font-bold text-slate-900">{outOfStockCount}</p>
                    <p className="text-xs text-slate-500">Out of Stock</p>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search products..."
                        className="pl-10 h-10 rounded-xl border-slate-200"
                    />
                </div>

                {/* Categories */}
                <div className="overflow-x-auto no-scrollbar pb-1">
                    <div className="flex gap-2">
                        <Button
                            variant={selectedCategoryId === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategoryId(null)}
                            className={`rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest ${selectedCategoryId === null ? "bg-primary hover:bg-primary/90 text-white border-none" : "text-slate-500 hover:border-primary/30"
                                }`}
                        >
                            All
                        </Button>
                        {categories.map((cat: any) => (
                            <Button
                                key={cat.id}
                                variant={selectedCategoryId === cat.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`rounded-full px-4 h-8 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${selectedCategoryId === cat.id ? "bg-primary hover:bg-primary/90 text-white border-none" : "text-slate-500 hover:border-primary/30"
                                    }`}
                            >
                                {cat.name}
                                {selectedCategoryId === cat.id && <Tag className="w-2.5 h-2.5" />}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products List */}
            <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                {filteredProducts.map((product: any) => {
                    const isInStock = product.is_available;

                    return (
                        <div
                            key={product.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isInStock ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200"
                                }`}
                        >
                            {/* Product Image */}
                            <div className="h-14 w-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {product.images?.[0]?.public_url ? (
                                    <img
                                        src={product.images[0].public_url}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-[10px] font-bold uppercase">
                                        No img
                                    </div>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate text-sm">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-primary font-bold">
                                        {formatINR(product.price)}
                                    </span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                        {product.category?.name || "Other"}
                                    </span>
                                </div>
                            </div>

                            {/* Stock status (read-only for staff) */}
                            <div className="flex flex-col items-end gap-1">
                                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${isInStock
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                    : "bg-rose-50 text-rose-600 border border-rose-100"
                                    }`}>
                                    {isInStock ? "In Stock" : "Out"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">No products found</p>
                </div>
            )}
        </div>
    );
}
