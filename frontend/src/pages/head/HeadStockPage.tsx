import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProducts, fetchCategories, toggleProductAvailability } from "@/lib/staff-api";
import { formatINR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
    Search,
    Loader2,
    RefreshCw,
    Tag,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function HeadStockPage() {
    const queryClient = useQueryClient();
    const [query, setQuery] = React.useState("");
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

    // Fetch products from API
    const { data: productsData, isLoading: productsLoading, error: productsError, refetch: refetchProducts } = useQuery({
        queryKey: ['staff-products'],
        queryFn: fetchProducts,
    });

    // Fetch categories from API
    const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
        queryKey: ['staff-categories'],
        queryFn: fetchCategories,
    });

    const products = productsData?.products || [];
    const categories = categoriesData?.data || [];

    // Toggle Availability Mutation
    const toggleMutation = useMutation({
        mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
            toggleProductAvailability(productId, isAvailable),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff-products'] });
            toast.success("Stock status updated");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update stock");
        }
    });

    const handleToggle = (productId: string, currentStatus: boolean) => {
        toggleMutation.mutate({ productId, isAvailable: !currentStatus });
    };

    // Filter products by search and category
    const filteredProducts = React.useMemo(() => {
        let result = products;
        const q = query.trim().toLowerCase();
        if (q) {
            result = result.filter((p: any) =>
                p.name.toLowerCase().includes(q) ||
                p.category?.name?.toLowerCase().includes(q)
            );
        }
        if (selectedCategoryId) {
            result = result.filter((p: any) => p.category_id === selectedCategoryId);
        }
        return result;
    }, [products, query, selectedCategoryId]);

    const stats = React.useMemo(() => ({
        total: products.length,
        inStock: products.filter((p: any) => p.is_active).length,
        outOfStock: products.filter((p: any) => !p.is_active).length,
    }), [products]);

    if (productsLoading || categoriesLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (productsError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Connection Error</h3>
                <p className="text-slate-500 text-sm mb-6">Failed to load stock data. Please check your internet.</p>
                <Button onClick={() => refetchProducts()} className="rounded-xl h-12 px-8">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Loading
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 px-1">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Management</h1>
                    <p className="text-slate-500 text-sm font-medium">Quickly toggle item availability</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total</p>
                        <p className="text-lg font-black text-slate-900">{stats.total}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">In Stock</p>
                        <p className="text-lg font-black text-emerald-600">{stats.inStock}</p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Out</p>
                        <p className="text-lg font-black text-rose-600">{stats.outOfStock}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-4 px-1 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md py-2 -mx-1">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search for items..."
                        className="pl-11 h-12 rounded-2xl border-slate-200 bg-white focus:ring-primary/20 transition-all shadow-sm"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setSelectedCategoryId(null)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${selectedCategoryId === null
                            ? "bg-slate-900 text-white"
                            : "bg-white text-slate-500 border border-slate-100"
                            }`}
                    >
                        All Items
                    </button>
                    {categories.map((cat: any) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${selectedCategoryId === cat.id
                                ? "bg-primary text-white"
                                : "bg-white text-slate-500 border border-slate-100"
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stock List */}
            <div className="space-y-3">
                {filteredProducts.map((product: any) => {
                    const isInStock = product.is_active;
                    const isUpdating = toggleMutation.isPending && toggleMutation.variables?.productId === product.id;

                    return (
                        <div
                            key={product.id}
                            className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all group ${isInStock
                                ? "bg-white border-slate-50 hover:border-emerald-100"
                                : "bg-slate-50/50 border-rose-50"
                                }`}
                        >
                            {/* Icon/Image Placeholder */}
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isInStock ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                }`}>
                                <Package className="h-6 w-6" />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                                    <Badge variant="outline" className="text-[9px] font-bold h-4 px-1 border-slate-200 text-slate-400">
                                        {formatINR(product.price)}
                                    </Badge>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                        <Tag className="h-3 w-3" />
                                        {product.category?.name || "Main Menu"}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium">
                                        Updated: {new Date(product.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Control */}
                            <div className="flex flex-col items-center gap-1.5 px-1">
                                <Switch
                                    checked={isInStock}
                                    onCheckedChange={() => handleToggle(product.id, isInStock)}
                                    disabled={isUpdating}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${isInStock ? "text-emerald-500" : "text-rose-500"
                                    }`}>
                                    {isUpdating ? "..." : (isInStock ? "In Stock" : "Out")}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 px-6">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No items found</p>
                        <p className="text-slate-400 text-sm mt-1">Try a different search or category</p>
                    </div>
                )}
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
