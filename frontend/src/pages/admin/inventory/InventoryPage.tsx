import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Package2, Plus, Trash2, Edit2, AlertTriangle, TrendingDown, TrendingUp,
<<<<<<< HEAD
  RotateCcw, ChevronDown, ChevronRight, History, ChefHat, BookOpen, Minus, Clock
=======
  RotateCcw, ChevronDown, ChevronRight, History, ChefHat, BookOpen, Minus
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: string;
  reorder_level: string | null;
  cost_per_unit: string;
  category: string | null;
<<<<<<< HEAD
  expiry_date: string | null;
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
  is_active: boolean;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: string;
  unit_cost: string | null;
  notes: string | null;
  created_at: string;
}

interface ProductBasic {
  id: string;
  name: string;
<<<<<<< HEAD
  price: string;
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
  category_id: string | null;
}

interface RecipeLine {
  id: string;
  ingredient_id: string;
  quantity: string;
  ingredient: { id: string; name: string; unit: string; cost_per_unit: string };
}

<<<<<<< HEAD
type Tab = "ingredients" | "recipes" | "low-stock" | "food-cost" | "expiring";
=======
type Tab = "ingredients" | "recipes";
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980

const UNITS = ["pcs", "kg", "g", "L", "ml", "dozen", "box", "bag"];
const MOVEMENT_TYPES = ["PURCHASE", "WASTE", "ADJUSTMENT"] as const;

const MOVEMENT_COLORS: Record<string, string> = {
  PURCHASE: "text-emerald-600",
  CONSUMPTION: "text-slate-500",
  WASTE: "text-rose-500",
  ADJUSTMENT: "text-blue-500",
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("ingredients");
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Recipe tab state
  const [products, setProducts] = React.useState<ProductBasic[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const [recipeDialog, setRecipeDialog] = React.useState(false);
  const [recipeProduct, setRecipeProduct] = React.useState<ProductBasic | null>(null);
  const [recipeLines, setRecipeLines] = React.useState<RecipeLine[]>([]);
  const [recipeLoading, setRecipeLoading] = React.useState(false);
  const [recipeSaving, setRecipeSaving] = React.useState(false);
  // Draft lines in dialog: { ingredient_id, quantity }
  const [draftLines, setDraftLines] = React.useState<{ ingredient_id: string; quantity: string }[]>([]);

<<<<<<< HEAD
  // Food cost tab state: map productId -> ingredient cost
  const [foodCostData, setFoodCostData] = React.useState<Record<string, number>>({});
  const [foodCostLoading, setFoodCostLoading] = React.useState(false);

  // Ingredient CRUD dialog
  const [ingredientDialog, setIngredientDialog] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<Ingredient | null>(null);
  const [iForm, setIForm] = React.useState({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", expiry_date: "", is_active: true });
=======
  // Ingredient CRUD dialog
  const [ingredientDialog, setIngredientDialog] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<Ingredient | null>(null);
  const [iForm, setIForm] = React.useState({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", is_active: true });
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
  const [saving, setSaving] = React.useState(false);

  // Adjustment dialog
  const [adjustDialog, setAdjustDialog] = React.useState(false);
  const [adjustTarget, setAdjustTarget] = React.useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = React.useState<typeof MOVEMENT_TYPES[number]>("PURCHASE");
  const [adjustQty, setAdjustQty] = React.useState("");
  const [adjustNotes, setAdjustNotes] = React.useState("");
  const [adjusting, setAdjusting] = React.useState(false);

  // Movement history
  const [historyDialog, setHistoryDialog] = React.useState(false);
  const [historyTarget, setHistoryTarget] = React.useState<Ingredient | null>(null);
  const [movements, setMovements] = React.useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: Ingredient[] }>("/restaurant/inventory/ingredients");
      setIngredients((res.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const loadProducts = async () => {
    if (products.length > 0) return;
    setProductsLoading(true);
    try {
      const res = await apiClient.get<{ products: ProductBasic[] }>("/products");
      setProducts((res.data as any)?.products ?? []);
    } catch { /* ignore */ } finally { setProductsLoading(false); }
  };

  React.useEffect(() => {
    if (activeTab === "recipes") void loadProducts();
<<<<<<< HEAD
    if (activeTab === "food-cost") void loadFoodCost();
  }, [activeTab]);

  const loadFoodCost = async () => {
    if (products.length === 0) {
      setFoodCostLoading(true);
      try {
        const res = await apiClient.get<{ products: ProductBasic[] }>("/products");
        const prods: ProductBasic[] = (res.data as any)?.products ?? [];
        setProducts(prods);
        await computeFoodCost(prods);
      } catch { /* ignore */ } finally { setFoodCostLoading(false); }
    } else {
      await computeFoodCost(products);
    }
  };

  const computeFoodCost = async (prods: ProductBasic[]) => {
    setFoodCostLoading(true);
    const costs: Record<string, number> = {};
    await Promise.all(
      prods.map(async (p) => {
        try {
          const res = await apiClient.get<{ data: RecipeLine[] }>(`/restaurant/inventory/recipes/${p.id}`);
          const lines: RecipeLine[] = (res.data as any)?.data ?? [];
          costs[p.id] = lines.reduce(
            (sum, l) => sum + Number(l.quantity) * Number(l.ingredient.cost_per_unit),
            0
          );
        } catch { costs[p.id] = -1; }
      })
    );
    setFoodCostData(costs);
    setFoodCostLoading(false);
  };

=======
  }, [activeTab]);

>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
  const openRecipeEditor = async (product: ProductBasic) => {
    setRecipeProduct(product);
    setDraftLines([]);
    setRecipeDialog(true);
    setRecipeLoading(true);
    try {
      const res = await apiClient.get<{ data: RecipeLine[] }>(`/restaurant/inventory/recipes/${product.id}`);
      const lines = (res.data as any)?.data ?? [];
      setRecipeLines(lines);
      setDraftLines(lines.map((l: RecipeLine) => ({ ingredient_id: l.ingredient_id, quantity: String(l.quantity) })));
    } catch { /* ignore */ } finally { setRecipeLoading(false); }
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    const valid = draftLines.filter(l => l.ingredient_id && l.quantity && Number(l.quantity) > 0);
    setRecipeSaving(true);
    try {
      await apiClient.put(`/restaurant/inventory/recipes/${recipeProduct.id}`, {
        lines: valid.map(l => ({ ingredient_id: l.ingredient_id, quantity: parseFloat(l.quantity) })),
      });
      toast.success("Recipe saved");
      setRecipeDialog(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save recipe");
    } finally { setRecipeSaving(false); }
  };

  const openNewIngredient = () => {
    setEditingIngredient(null);
<<<<<<< HEAD
    setIForm({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", expiry_date: "", is_active: true });
=======
    setIForm({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", is_active: true });
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
    setIngredientDialog(true);
  };

  const openEditIngredient = (i: Ingredient) => {
    setEditingIngredient(i);
<<<<<<< HEAD
    setIForm({ name: i.name, unit: i.unit, reorder_level: i.reorder_level ?? "", cost_per_unit: String(i.cost_per_unit), category: i.category ?? "", expiry_date: i.expiry_date ? i.expiry_date.split('T')[0] : "", is_active: i.is_active });
=======
    setIForm({ name: i.name, unit: i.unit, reorder_level: i.reorder_level ?? "", cost_per_unit: String(i.cost_per_unit), category: i.category ?? "", is_active: i.is_active });
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
    setIngredientDialog(true);
  };

  const handleSaveIngredient = async () => {
    if (!iForm.name.trim()) { toast.error("Ingredient name required"); return; }
    setSaving(true);
    try {
      const payload = { ...iForm, reorder_level: iForm.reorder_level || null, category: iForm.category || null };
      if (editingIngredient) {
        await apiClient.patch(`/restaurant/inventory/ingredients/${editingIngredient.id}`, payload);
        toast.success("Ingredient updated");
      } else {
        await apiClient.post("/restaurant/inventory/ingredients", payload);
        toast.success("Ingredient added");
      }
      setIngredientDialog(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (!confirm("Delete this ingredient? All stock movements will also be deleted.")) return;
    try {
      await apiClient.delete(`/restaurant/inventory/ingredients/${id}`);
      toast.success("Ingredient deleted");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const openAdjust = (i: Ingredient) => {
    setAdjustTarget(i);
    setAdjustType("PURCHASE");
    setAdjustQty("");
    setAdjustNotes("");
    setAdjustDialog(true);
  };

  const handleAdjust = async () => {
    if (!adjustTarget || !adjustQty) { toast.error("Enter a quantity"); return; }
    setAdjusting(true);
    try {
      await apiClient.post(`/restaurant/inventory/ingredients/${adjustTarget.id}/adjustment`, {
        type: adjustType,
        quantity: parseFloat(adjustQty),
        notes: adjustNotes || undefined,
      });
      toast.success(`Stock ${adjustType.toLowerCase()}d successfully`);
      setAdjustDialog(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  const openHistory = async (i: Ingredient) => {
    setHistoryTarget(i);
    setMovements([]);
    setHistoryDialog(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<{ data: StockMovement[] }>(`/restaurant/inventory/ingredients/${i.id}/movements`);
      setMovements((res.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = ingredients.filter((i) => i.reorder_level && Number(i.current_stock) <= Number(i.reorder_level)).length;

<<<<<<< HEAD
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringIngredients = ingredients.filter((i) => i.expiry_date && new Date(i.expiry_date) <= sevenDaysFromNow);
  const expiredIngredients = ingredients.filter((i) => i.expiry_date && new Date(i.expiry_date) < now);
  const expiringCount = expiringIngredients.length;

  const getExpiryBadge = (expiry_date: string | null) => {
    if (!expiry_date) return null;
    const d = new Date(expiry_date);
    const daysLeft = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", cls: "bg-rose-100 text-rose-700" };
    if (daysLeft === 0) return { label: "Expires today", cls: "bg-rose-100 text-rose-700" };
    if (daysLeft <= 3) return { label: `${daysLeft}d left`, cls: "bg-rose-100 text-rose-700" };
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, cls: "bg-amber-100 text-amber-700" };
    return { label: `${daysLeft}d left`, cls: "bg-slate-100 text-slate-500" };
  };

=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Package2 className="h-5 w-5 text-teal-500" />
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track ingredient stock levels, purchases, and waste</p>
        </div>
        {activeTab === "ingredients" && (
          <Button onClick={openNewIngredient} className="rounded-xl gap-2 h-9 text-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Add Ingredient
          </Button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex rounded-2xl border border-slate-200 bg-white p-1 gap-1 w-fit">
        {([["ingredients", Package2, "Ingredients"], ["recipes", ChefHat, "Recipes / BOM"]] as const).map(([tab, Icon, label]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab as Tab)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", activeTab === tab ? "bg-teal-600 text-white shadow" : "text-slate-500 hover:bg-slate-50")}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
<<<<<<< HEAD
        <button type="button" onClick={() => setActiveTab("low-stock")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", activeTab === "low-stock" ? "bg-amber-500 text-white shadow" : "text-slate-500 hover:bg-slate-50")}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Low Stock
          {lowStockCount > 0 && (
            <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center", activeTab === "low-stock" ? "bg-white text-amber-600" : "bg-amber-100 text-amber-700")}>
              {lowStockCount}
            </span>
          )}
        </button>
        <button type="button" onClick={() => setActiveTab("expiring")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", activeTab === "expiring" ? "bg-rose-500 text-white shadow" : "text-slate-500 hover:bg-slate-50")}>
          <Clock className="h-3.5 w-3.5" />
          Expiring
          {expiringCount > 0 && (
            <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center", activeTab === "expiring" ? "bg-white text-rose-600" : "bg-rose-100 text-rose-700")}>
              {expiringCount}
            </span>
          )}
        </button>
        <button type="button" onClick={() => setActiveTab("food-cost")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all", activeTab === "food-cost" ? "bg-teal-600 text-white shadow" : "text-slate-500 hover:bg-slate-50")}>
          <TrendingUp className="h-3.5 w-3.5" /> Food Cost
        </button>
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">
            {lowStockCount} ingredient{lowStockCount > 1 ? "s are" : " is"} below reorder level
          </p>
        </div>
      )}

      {activeTab === "ingredients" && (<>
      {/* Search */}
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients..."
          className="h-10 rounded-xl pl-4"
        />
      </div>

      {/* Ingredients table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Package2 className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            {search ? "No ingredients match your search." : "No ingredients yet. Add your first ingredient to start tracking stock."}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Ingredient</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Stock</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest hidden sm:table-cell">Reorder At</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest hidden md:table-cell">Cost/Unit</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ing) => {
                const isLow = ing.reorder_level !== null && Number(ing.current_stock) <= Number(ing.reorder_level);
<<<<<<< HEAD
                const expiryBadge = getExpiryBadge(ing.expiry_date);
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
                return (
                  <tr key={ing.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{ing.name}</p>
<<<<<<< HEAD
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {ing.category && <p className="text-[11px] text-slate-400">{ing.category}</p>}
                        {expiryBadge && (
                          <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full", expiryBadge.cls)}>
                            {expiryBadge.label}
                          </span>
                        )}
                      </div>
=======
                      {ing.category && <p className="text-[11px] text-slate-400">{ing.category}</p>}
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-black tabular-nums", isLow ? "text-rose-600" : "text-slate-700")}>
                        {Number(ing.current_stock).toFixed(2)}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">{ing.unit}</span>
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">
                      {ing.reorder_level ? `${ing.reorder_level} ${ing.unit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden md:table-cell">
                      {Number(ing.cost_per_unit) > 0 ? `₹${Number(ing.cost_per_unit).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openAdjust(ing)} title="Adjust Stock"
                          className="h-7 w-7 rounded-lg text-teal-500 hover:bg-teal-50 flex items-center justify-center">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => void openHistory(ing)} title="Movement History"
                          className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEditIngredient(ing)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => void handleDeleteIngredient(ing.id)}
                          className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      </>)}

      {/* Recipes / BOM Tab */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="relative">
            <Input value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} placeholder="Search products..." className="h-10 rounded-xl pl-4" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {productsLoading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-200" />No products found.
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Product</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.name.toLowerCase().includes(recipeSearch.toLowerCase())).map(p => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1.5"
                            onClick={() => void openRecipeEditor(p)}>
                            <ChefHat className="h-3.5 w-3.5" /> Edit Recipe
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Low Stock Tab */}
      {activeTab === "low-stock" && (
        <div className="space-y-4">
          {lowStockCount === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <TrendingDown className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500 font-medium">All ingredients are sufficiently stocked</p>
              <p className="text-sm text-slate-400 mt-1">Set reorder levels on ingredients to see alerts here</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-bold text-amber-700">{lowStockCount} ingredient{lowStockCount > 1 ? "s" : ""} below reorder level</span>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Ingredient</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Current Stock</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Reorder At</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Shortage</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients
                    .filter((i) => i.reorder_level !== null && Number(i.current_stock) <= Number(i.reorder_level))
                    .sort((a, b) => Number(a.current_stock) - Number(b.current_stock))
                    .map((ing) => {
                      const shortage = Number(ing.reorder_level) - Number(ing.current_stock);
                      return (
                        <tr key={ing.id} className="border-t border-slate-100 hover:bg-amber-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{ing.name}</p>
                            {ing.category && <p className="text-[10px] text-slate-400">{ing.category}</p>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-black text-rose-600">{Number(ing.current_stock).toFixed(2)} {ing.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{Number(ing.reorder_level).toFixed(2)} {ing.unit}</td>
                          <td className="px-4 py-3 text-right text-amber-600 font-bold">{shortage.toFixed(2)} {ing.unit}</td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1.5"
                              onClick={() => { setAdjustTarget(ing); setAdjustType("PURCHASE"); setAdjustQty(""); setAdjustNotes(""); setAdjustDialog(true); }}>
                              <RotateCcw className="h-3.5 w-3.5" /> Restock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Food Cost Tab */}
      {activeTab === "food-cost" && (
        <div className="space-y-3">
          {foodCostLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Computing food costs...</div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500 font-medium">No products found</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-bold text-slate-700">Food Cost Analysis</span>
                <span className="ml-auto text-xs text-slate-400">Highlight: &gt;35% food cost ratio</span>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Product</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Selling Price</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Ingredient Cost</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Gross Margin</th>
                    <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Food Cost %</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter((p) => foodCostData[p.id] !== undefined && foodCostData[p.id] >= 0)
                    .sort((a, b) => {
                      const aRatio = Number(a.price) > 0 ? (foodCostData[a.id] / Number(a.price)) * 100 : 0;
                      const bRatio = Number(b.price) > 0 ? (foodCostData[b.id] / Number(b.price)) * 100 : 0;
                      return bRatio - aRatio;
                    })
                    .map((p) => {
                      const cost = foodCostData[p.id] ?? 0;
                      const price = Number(p.price);
                      const margin = price - cost;
                      const ratio = price > 0 ? (cost / price) * 100 : 0;
                      const isHighCost = ratio > 35;
                      return (
                        <tr key={p.id} className={cn("border-t border-slate-100 hover:bg-slate-50 transition-colors", isHighCost && "bg-rose-50/30")}>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">₹{price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">₹{cost.toFixed(2)}</td>
                          <td className={cn("px-4 py-3 text-right font-mono font-bold", margin >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            ₹{margin.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn("text-xs font-black px-2 py-0.5 rounded-full", isHighCost ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                              {ratio.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {products.filter((p) => foodCostData[p.id] === undefined || foodCostData[p.id] < 0 || foodCostData[p.id] === 0).length > 0 && (
                    <tr className="border-t border-dashed border-slate-200">
                      <td colSpan={5} className="px-4 py-3 text-xs text-slate-400 text-center italic">
                        {products.filter((p) => foodCostData[p.id] === undefined || foodCostData[p.id] === 0).length} products have no recipe defined
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Expiring Tab */}
      {activeTab === "expiring" && (
        <div className="space-y-4">
          {expiringIngredients.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Clock className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="text-slate-500 font-medium">No ingredients expiring within 7 days</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-bold text-rose-700">
                  {expiredIngredients.length > 0 ? `${expiredIngredients.length} expired, ` : ''}{expiringIngredients.length - expiredIngredients.length} expiring within 7 days
                </span>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider">Ingredient</th>
                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider">Expiry Date</th>
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {expiringIngredients.sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()).map((ing) => {
                    const expiryBadge = getExpiryBadge(ing.expiry_date)!;
                    return (
                      <tr key={ing.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{ing.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{Number(ing.current_stock).toFixed(2)} {ing.unit}</td>
                        <td className="px-4 py-3 text-center text-slate-500">
                          {ing.expiry_date ? format(new Date(ing.expiry_date), 'd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", expiryBadge.cls)}>
                            {expiryBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEditIngredient(ing)} title="Edit expiry date"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center mx-auto">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
      {/* Recipe Edit Dialog */}
      <Dialog open={recipeDialog} onOpenChange={setRecipeDialog}>
        <DialogContent className="max-w-lg rounded-2xl p-6 space-y-4 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogTitle className="text-base font-black uppercase tracking-tight shrink-0">
            Recipe — {recipeProduct?.name}
          </DialogTitle>
          <p className="text-xs text-slate-500 shrink-0">Define which ingredients and quantities are used per serving. Stock will auto-deduct when orders are marked completed.</p>

          {recipeLoading ? (
            <p className="text-slate-400 text-sm text-center py-4">Loading...</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {draftLines.map((line, idx) => {
                const ing = ingredients.find(i => i.id === line.ingredient_id);
                return (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2">
                    <select value={line.ingredient_id}
                      onChange={e => setDraftLines(prev => prev.map((l, i) => i === idx ? { ...l, ingredient_id: e.target.value } : l))}
                      className="flex-1 h-9 rounded-lg border border-slate-200 text-xs px-2 bg-white">
                      <option value="">Select ingredient...</option>
                      {ingredients.filter(i => i.is_active).map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 shrink-0">
                      <Input type="number" value={line.quantity} min={0.001} step={0.1}
                        onChange={e => setDraftLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: e.target.value } : l))}
                        className="w-20 h-9 rounded-lg text-xs text-right" placeholder="Qty" />
                      {ing && <span className="text-[10px] text-slate-400 w-8 shrink-0">{ing.unit}</span>}
                    </div>
                    <button type="button" onClick={() => setDraftLines(prev => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <button type="button"
                onClick={() => setDraftLines(prev => [...prev, { ingredient_id: "", quantity: "" }])}
                className="w-full h-9 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold hover:border-teal-400 hover:text-teal-600 transition-all flex items-center justify-center gap-2">
                <Plus className="h-3.5 w-3.5" /> Add Ingredient
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2 shrink-0">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRecipeDialog(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-700" onClick={() => void handleSaveRecipe()} disabled={recipeSaving}>
              {recipeSaving ? "Saving..." : "Save Recipe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Ingredient Dialog */}
      <Dialog open={ingredientDialog} onOpenChange={setIngredientDialog}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">
            {editingIngredient ? "Edit Ingredient" : "Add Ingredient"}
          </DialogTitle>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</Label>
              <Input value={iForm.name} onChange={(e) => setIForm((p) => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Tomatoes, Flour" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unit</Label>
              <select value={iForm.unit} onChange={(e) => setIForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full h-10 rounded-xl border border-slate-200 text-sm px-3 bg-white">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</Label>
              <Input value={iForm.category} onChange={(e) => setIForm((p) => ({ ...p, category: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Vegetables" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cost per Unit (₹)</Label>
              <Input type="number" value={iForm.cost_per_unit} onChange={(e) => setIForm((p) => ({ ...p, cost_per_unit: e.target.value }))} className="h-10 rounded-xl" min={0} step={0.01} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Reorder Level</Label>
              <Input type="number" value={iForm.reorder_level} onChange={(e) => setIForm((p) => ({ ...p, reorder_level: e.target.value }))} className="h-10 rounded-xl" min={0} step={0.1} placeholder="Optional" />
            </div>
<<<<<<< HEAD
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date (optional)</Label>
              <Input type="date" value={iForm.expiry_date} onChange={(e) => setIForm((p) => ({ ...p, expiry_date: e.target.value }))} className="h-10 rounded-xl" />
            </div>
=======
>>>>>>> e64fa6d97db3794800d20b234cd7fc9c8a744980
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setIngredientDialog(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSaveIngredient()} disabled={saving}>
              {saving ? "Saving..." : editingIngredient ? "Update" : "Add Ingredient"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-sm rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">
            Adjust Stock — {adjustTarget?.name}
          </DialogTitle>
          <p className="text-xs text-slate-500">Current: <span className="font-black text-slate-800">{adjustTarget ? `${Number(adjustTarget.current_stock).toFixed(2)} ${adjustTarget.unit}` : "—"}</span></p>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Movement Type</Label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden h-10">
              {MOVEMENT_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setAdjustType(t)}
                  className={cn("flex-1 text-[10px] font-black transition-all", adjustType === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Quantity ({adjustTarget?.unit})
            </Label>
            <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="h-10 rounded-xl" min={0.001} step={0.1} placeholder="0" />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes (optional)</Label>
            <Input value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} className="h-10 rounded-xl" placeholder={adjustType === "PURCHASE" ? "Supplier name / Invoice #" : adjustType === "WASTE" ? "Reason for waste" : "Reason for adjustment"} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setAdjustDialog(false)}>Cancel</Button>
            <Button className={cn("flex-1 rounded-xl", adjustType === "WASTE" ? "bg-rose-600 hover:bg-rose-700" : adjustType === "PURCHASE" ? "bg-emerald-600 hover:bg-emerald-700" : "")}
              onClick={() => void handleAdjust()} disabled={adjusting}>
              {adjusting ? "Adjusting..." : adjustType === "PURCHASE" ? "Record Purchase" : adjustType === "WASTE" ? "Record Waste" : "Record Adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-3 max-h-[80vh] overflow-hidden flex flex-col">
          <DialogTitle className="text-base font-black uppercase tracking-tight shrink-0">
            {historyTarget?.name} — Movement History
          </DialogTitle>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {historyLoading ? (
              <p className="text-slate-400 text-sm text-center py-4">Loading...</p>
            ) : movements.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No movements recorded yet.</p>
            ) : movements.map((m) => {
              const qty = Number(m.quantity);
              const isPositive = qty > 0;
              return (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[11px] font-black uppercase", MOVEMENT_COLORS[m.type] ?? "text-slate-500")}>{m.type}</span>
                      {m.notes && <span className="text-[11px] text-slate-400">{m.notes}</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{format(parseISO(m.created_at), "d MMM yyyy, hh:mm a")}</p>
                  </div>
                  <span className={cn("font-black tabular-nums text-sm", isPositive ? "text-emerald-600" : "text-rose-500")}>
                    {isPositive ? "+" : ""}{qty.toFixed(2)} {historyTarget?.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
