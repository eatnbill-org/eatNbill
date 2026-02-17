import * as React from "react";
import { useProductsStore } from "@/stores/products";
import { formatINR } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Package } from "lucide-react";
import { toast } from "sonner";
import { useCategoriesStore } from "@/stores/categories";
import { TableSkeleton } from "@/components/ui/skeleton";

export default function ManagerStockPage() {
  const { products, fetchProducts, updateProduct, loading } = useProductsStore();
  const { categories, fetchCategories } = useCategoriesStore();
  const [query, setQuery] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const filtered = React.useMemo(() => {
    let result = products;

    // Filter by text query
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name || "").toLowerCase().includes(q) ||
        formatINR(p.price).toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (selectedCategoryId) {
      result = result.filter(p => p.category_id === selectedCategoryId);
    }

    return result;
  }, [products, query, selectedCategoryId]);

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    try {
      await updateProduct(productId, { is_active: !currentStatus });
      toast.success(!currentStatus ? "Product activated" : "Product deactivated");
    } catch (error) {
      toast.error("Failed to update stock status");
    }
  };

  if (loading && products.length === 0) {
    return <TableSkeleton rows={8} />;
  }

  const activeCount = products.filter(p => p.is_active).length;
  const outOfStockCount = products.filter(p => !p.is_active).length;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Stock Management</h1>
            <p className="text-xs text-slate-500">Manage product availability</p>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="flex gap-3">
          <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-slate-900">{products.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">In Stock</p>
            <p className="text-xl font-black text-emerald-700">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-rose-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Out</p>
            <p className="text-xl font-black text-rose-700">{outOfStockCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-1.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, or price..."
              className="pl-10 h-10 border-none bg-transparent font-medium focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Category Dropdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex items-center min-w-[200px]">
          <select
            value={selectedCategoryId || ""}
            onChange={(e) => setSelectedCategoryId(e.target.value || null)}
            className="w-full h-10 px-3 bg-transparent border-none text-xs font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer"
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

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">Image</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50 border-slate-100">
                  <TableCell>
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 shadow-sm">
                      {p.images?.[0]?.public_url ? (
                        <img src={p.images[0].public_url} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                          NO IMG
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-slate-100">
                      {p.category?.name || "Other"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-slate-900">{formatINR(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={() => handleToggleStock(p.id, p.is_active)}
                        className="data-[state=checked]:bg-emerald-600 scale-90"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${p.is_active ? "text-emerald-600" : "text-rose-600"
                        }`}>
                        {p.is_active ? "In Stock" : "Out"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
