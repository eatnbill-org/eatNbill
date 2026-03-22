import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Package2, Plus, Trash2, Edit2, AlertTriangle, TrendingDown, TrendingUp,
  RotateCcw, ChevronDown, ChevronRight, History
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

const UNITS = ["pcs", "kg", "g", "L", "ml", "dozen", "box", "bag"];
const MOVEMENT_TYPES = ["PURCHASE", "WASTE", "ADJUSTMENT"] as const;

const MOVEMENT_COLORS: Record<string, string> = {
  PURCHASE: "text-emerald-600",
  CONSUMPTION: "text-slate-500",
  WASTE: "text-rose-500",
  ADJUSTMENT: "text-blue-500",
};

export default function InventoryPage() {
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Ingredient CRUD dialog
  const [ingredientDialog, setIngredientDialog] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<Ingredient | null>(null);
  const [iForm, setIForm] = React.useState({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", is_active: true });
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

  const openNewIngredient = () => {
    setEditingIngredient(null);
    setIForm({ name: "", unit: "pcs", reorder_level: "", cost_per_unit: "0", category: "", is_active: true });
    setIngredientDialog(true);
  };

  const openEditIngredient = (i: Ingredient) => {
    setEditingIngredient(i);
    setIForm({ name: i.name, unit: i.unit, reorder_level: i.reorder_level ?? "", cost_per_unit: String(i.cost_per_unit), category: i.category ?? "", is_active: i.is_active });
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
        <Button onClick={openNewIngredient} className="rounded-xl gap-2 h-9 text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> Add Ingredient
        </Button>
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
                return (
                  <tr key={ing.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{ing.name}</p>
                      {ing.category && <p className="text-[11px] text-slate-400">{ing.category}</p>}
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
