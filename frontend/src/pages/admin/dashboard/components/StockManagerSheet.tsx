import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useProductsStore } from "@/stores/products";
import { useCategoriesStore } from "@/stores/categories";
import { formatINR } from "@/lib/format";
import { Package, Search, AlertCircle, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ListSkeleton } from "@/components/ui/skeleton";

interface StockManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockManagerSheet({ open, onOpenChange }: StockManagerSheetProps) {
  const { products, loading, fetchProducts, updateProduct } = useProductsStore();
  const { categories, fetchCategories } = useCategoriesStore();
  const [query, setQuery] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      fetchProducts();
      fetchCategories();
    }
  }, [open, fetchProducts, fetchCategories]);

  const filtered = React.useMemo(() => {
    let result = products;

    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name || "").toLowerCase().includes(q)
      );
    }

    if (selectedCategoryId) {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }

    return result;
  }, [products, query, selectedCategoryId]);

  const handleToggle = async (id: string, current: boolean) => {
    const success = await updateProduct(id, { is_active: !current });
    if (success) {
      toast.success(`Updated ${success.name}`);
    } else {
      toast.error("Failed to update stock");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[460px] p-0 border-none rounded-l-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <SheetHeader className="p-8 pb-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <SheetTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Inventory Control</SheetTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Real-time Stock Management</p>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products..."
                className="pl-11 h-12 bg-white border-slate-100 rounded-2xl focus-visible:ring-indigo-500 shadow-sm"
              />
            </div>

            {/* Category Filter */}
            <div className="relative group">
              <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <select
                value={selectedCategoryId || ""}
                onChange={e => setSelectedCategoryId(e.target.value || null)}
                className="w-full h-12 pl-11 pr-10 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none cursor-pointer hover:border-indigo-100 transition-all"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 bg-white">
          {loading && products.length === 0 ? (
            <div className="p-2">
              <ListSkeleton rows={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 opacity-50">
              <AlertCircle className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest">No products found</p>
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-100 transition-all group">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-800 tracking-tight leading-none mb-1">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatINR(p.price)}</p>
                    <span className="text-[10px] text-slate-300">•</span>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest truncate">{p.category?.name || 'Other'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${!p.is_active ? "text-rose-500" : "text-emerald-500"}`}>
                    {!p.is_active ? "Out" : "In Stock"}
                  </span>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={() => handleToggle(p.id, p.is_active)}
                    className="data-[state=checked]:bg-emerald-500 scale-90"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
              Toggling stock reflects immediately on the customer menu. Use this for items that are sold out for the current session.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
