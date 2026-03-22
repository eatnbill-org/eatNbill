import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Trash2, Edit2, X, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  price: string;
  category_id: string;
}

interface ComboComponent {
  id: string;
  product_id: string;
  quantity: number;
  product: { id: string; name: string; price: string };
}

interface ComboProduct {
  id: string;
  name: string;
  description: string | null;
  combo_price: string;
  is_active: boolean;
  components: ComboComponent[];
}

interface DraftComponent {
  product_id: string;
  quantity: number;
  name: string;
  price: string;
}

export default function CombosPage() {
  const [combos, setCombos] = React.useState<ComboProduct[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ComboProduct | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [comboPrice, setComboPrice] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [components, setComponents] = React.useState<DraftComponent[]>([]);
  const [addProductId, setAddProductId] = React.useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [combosRes, prodsRes] = await Promise.all([
        apiClient.get<{ data: ComboProduct[] }>("/restaurant/combos"),
        apiClient.get<{ data: Product[] }>("/restaurant/products"),
      ]);
      setCombos((combosRes.data as any)?.data ?? []);
      setProducts((prodsRes.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const resetForm = () => { setName(""); setDescription(""); setComboPrice(""); setIsActive(true); setComponents([]); setAddProductId(""); };

  const openNew = () => { setEditing(null); resetForm(); setDialogOpen(true); };

  const openEdit = (c: ComboProduct) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setComboPrice(String(c.combo_price));
    setIsActive(c.is_active);
    setComponents(c.components.map((comp) => ({
      product_id: comp.product_id,
      quantity: comp.quantity,
      name: comp.product.name,
      price: comp.product.price,
    })));
    setAddProductId("");
    setDialogOpen(true);
  };

  const handleAddComponent = () => {
    if (!addProductId) return;
    if (components.find((c) => c.product_id === addProductId)) {
      toast.error("Product already in combo");
      return;
    }
    const prod = products.find((p) => p.id === addProductId);
    if (!prod) return;
    setComponents((prev) => [...prev, { product_id: prod.id, quantity: 1, name: prod.name, price: prod.price }]);
    setAddProductId("");
  };

  const updateQty = (productId: string, qty: number) => {
    setComponents((prev) => prev.map((c) => c.product_id === productId ? { ...c, quantity: Math.max(1, qty) } : c));
  };

  const removeComponent = (productId: string) => {
    setComponents((prev) => prev.filter((c) => c.product_id !== productId));
  };

  // Auto-suggest combo price as sum of components
  const componentTotal = components.reduce((sum, c) => sum + c.quantity * parseFloat(c.price), 0);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Combo name required"); return; }
    if (components.length < 2) { toast.error("A combo needs at least 2 components"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        combo_price: parseFloat(comboPrice) || componentTotal,
        is_active: isActive,
        components: components.map((c) => ({ product_id: c.product_id, quantity: c.quantity })),
      };
      if (editing) {
        await apiClient.patch(`/restaurant/combos/${editing.id}`, payload);
        toast.success("Combo updated");
      } else {
        await apiClient.post("/restaurant/combos", payload);
        toast.success("Combo created");
      }
      setDialogOpen(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this combo?")) return;
    try {
      await apiClient.delete(`/restaurant/combos/${id}`);
      toast.success("Combo deleted");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleToggle = async (c: ComboProduct) => {
    try {
      await apiClient.patch(`/restaurant/combos/${c.id}`, { is_active: !c.is_active });
      void load();
    } catch { /* ignore */ }
  };

  const availableProducts = products.filter((p) => !components.find((c) => c.product_id === p.id));

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            Combo Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Bundle products together at a special price</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2 h-9 text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> New Combo
        </Button>
      </div>

      {/* Combos list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : combos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Package className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            No combos yet. Create a bundle deal for your customers.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {combos.map((combo) => (
              <div key={combo.id} className="p-4 flex items-start gap-4">
                <div className={cn("mt-0.5 p-2 rounded-xl", combo.is_active ? "bg-indigo-50" : "bg-slate-50")}>
                  <ShoppingBag className={cn("h-4 w-4", combo.is_active ? "text-indigo-500" : "text-slate-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{combo.name}</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", combo.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                      {combo.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {combo.description && <p className="text-xs text-slate-400 mt-0.5">{combo.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {combo.components.map((comp) => (
                      <span key={comp.id} className="px-2 py-0.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 font-medium">
                        {comp.quantity > 1 && <span className="font-black">{comp.quantity}×</span>} {comp.product.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-black text-slate-900 text-sm">₹{combo.combo_price}</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={combo.is_active} onCheckedChange={() => void handleToggle(combo)} />
                    <button onClick={() => openEdit(combo)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => void handleDelete(combo.id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base font-black uppercase tracking-tight">
            {editing ? "Edit Combo" : "New Combo"}
          </DialogTitle>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Combo Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" placeholder="e.g. Family Meal Deal" />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-10 rounded-xl" placeholder="Short description for menu" />
          </div>

          {/* Components */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Components ({components.length})</Label>
            {components.length > 0 && (
              <div className="space-y-1.5">
                {components.map((c) => (
                  <div key={c.product_id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{c.name}</span>
                    <span className="text-[11px] text-slate-400">₹{c.price}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateQty(c.product_id, c.quantity - 1)} className="h-6 w-6 rounded-lg bg-slate-200 text-slate-600 text-xs font-black flex items-center justify-center hover:bg-slate-300">-</button>
                      <span className="w-5 text-center text-xs font-black">{c.quantity}</span>
                      <button type="button" onClick={() => updateQty(c.product_id, c.quantity + 1)} className="h-6 w-6 rounded-lg bg-slate-200 text-slate-600 text-xs font-black flex items-center justify-center hover:bg-slate-300">+</button>
                    </div>
                    <button type="button" onClick={() => removeComponent(c.product_id)} className="h-6 w-6 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {availableProducts.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={addProductId}
                  onChange={(e) => setAddProductId(e.target.value)}
                  className="flex-1 h-9 rounded-xl border border-slate-200 text-xs font-medium px-2 bg-white"
                >
                  <option value="">Select product to add...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
                  ))}
                </select>
                <Button type="button" variant="outline" className="h-9 px-3 rounded-xl text-xs font-black" onClick={handleAddComponent} disabled={!addProductId}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Combo Price (₹)
              {components.length > 0 && <span className="normal-case text-slate-400 ml-1">· Regular total: ₹{componentTotal.toFixed(2)}</span>}
            </Label>
            <Input
              type="number"
              value={comboPrice}
              onChange={(e) => setComboPrice(e.target.value)}
              className="h-10 rounded-xl"
              min={0}
              step={0.01}
              placeholder={components.length > 0 ? `e.g. ${(componentTotal * 0.85).toFixed(0)}` : "0.00"}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-semibold text-slate-700">Available for Ordering</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Combo" : "Create Combo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
