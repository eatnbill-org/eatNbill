import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Truck, Plus, Trash2, Edit2, Phone, Mail, Building2, Receipt, CheckCircle2, Clock, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  payment_terms: string | null;
  is_active: boolean;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface POLine {
  ingredient_id: string;
  quantity: string;
  unit_cost: string;
  name?: string;
  unit?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  total_amount: string;
  notes: string | null;
  supplier: { name: string };
  lines: { id: string; ingredient_id: string; quantity: string; unit_cost: string; total_cost: string; ingredient: { name: string; unit: string } }[];
}

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-50 text-blue-600",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-600",
};

export default function SuppliersPage() {
  const [tab, setTab] = React.useState<"suppliers" | "pos">("suppliers");
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [pos, setPos] = React.useState<PurchaseOrder[]>([]);
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Supplier CRUD dialog
  const [supplierDialog, setSupplierDialog] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [sForm, setSForm] = React.useState({ name: "", contact_name: "", phone: "", email: "", address: "", gst_number: "", payment_terms: "" });
  const [saving, setSaving] = React.useState(false);

  // PO dialog
  const [poDialog, setPoDialog] = React.useState(false);
  const [poSupplierId, setPoSupplierId] = React.useState("");
  const [poExpected, setPoExpected] = React.useState("");
  const [poNotes, setPoNotes] = React.useState("");
  const [poLines, setPoLines] = React.useState<POLine[]>([{ ingredient_id: "", quantity: "1", unit_cost: "0" }]);
  const [poSaving, setPoSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [supRes, poRes, ingRes] = await Promise.all([
        apiClient.get<{ data: Supplier[] }>("/restaurant/suppliers"),
        apiClient.get<{ data: PurchaseOrder[] }>("/restaurant/purchase-orders"),
        apiClient.get<{ data: Ingredient[] }>("/restaurant/inventory/ingredients"),
      ]);
      setSuppliers((supRes.data as any)?.data ?? []);
      setPos((poRes.data as any)?.data ?? []);
      setIngredients((ingRes.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const openNewSupplier = () => { setEditingSupplier(null); setSForm({ name: "", contact_name: "", phone: "", email: "", address: "", gst_number: "", payment_terms: "" }); setSupplierDialog(true); };
  const openEditSupplier = (s: Supplier) => { setEditingSupplier(s); setSForm({ name: s.name, contact_name: s.contact_name ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", gst_number: s.gst_number ?? "", payment_terms: s.payment_terms ?? "" }); setSupplierDialog(true); };

  const handleSaveSupplier = async () => {
    if (!sForm.name.trim()) { toast.error("Supplier name required"); return; }
    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(sForm).map(([k, v]) => [k, v || null]));
      payload.name = sForm.name;
      if (editingSupplier) {
        await apiClient.patch(`/restaurant/suppliers/${editingSupplier.id}`, payload);
        toast.success("Supplier updated");
      } else {
        await apiClient.post("/restaurant/suppliers", payload);
        toast.success("Supplier added");
      }
      setSupplierDialog(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await apiClient.delete(`/restaurant/suppliers/${id}`);
      toast.success("Supplier deleted");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const openNewPO = () => {
    setPoSupplierId(suppliers[0]?.id ?? "");
    setPoExpected("");
    setPoNotes("");
    setPoLines([{ ingredient_id: "", quantity: "1", unit_cost: "0" }]);
    setPoDialog(true);
  };

  const updatePoLine = (idx: number, field: keyof POLine, value: string) => {
    setPoLines((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === "ingredient_id") {
        const ing = ingredients.find((x) => x.id === value);
        if (ing) { updated.name = ing.name; updated.unit = ing.unit; }
      }
      return updated;
    }));
  };

  const poTotal = poLines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_cost) || 0), 0);

  const handleCreatePO = async () => {
    if (!poSupplierId) { toast.error("Select a supplier"); return; }
    const validLines = poLines.filter((l) => l.ingredient_id && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { toast.error("Add at least one line item"); return; }
    setPoSaving(true);
    try {
      await apiClient.post("/restaurant/purchase-orders", {
        supplier_id: poSupplierId,
        expected_date: poExpected || undefined,
        notes: poNotes || undefined,
        lines: validLines.map((l) => ({ ingredient_id: l.ingredient_id, quantity: parseFloat(l.quantity), unit_cost: parseFloat(l.unit_cost) })),
      });
      toast.success("Purchase order created");
      setPoDialog(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create PO");
    } finally {
      setPoSaving(false);
    }
  };

  const handleReceivePO = async (po: PurchaseOrder) => {
    if (!confirm(`Mark PO ${po.po_number} as received? This will update inventory stock levels.`)) return;
    try {
      await apiClient.patch(`/restaurant/purchase-orders/${po.id}/receive`, {});
      toast.success(`PO ${po.po_number} received — stock updated`);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to receive PO");
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            Suppliers & Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage vendors and track stock purchases</p>
        </div>
        <div className="flex gap-2">
          {tab === "suppliers" ? (
            <Button onClick={openNewSupplier} className="rounded-xl gap-2 h-9 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" /> Add Supplier
            </Button>
          ) : (
            <Button onClick={openNewPO} disabled={suppliers.length === 0 || ingredients.length === 0} className="rounded-xl gap-2 h-9 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" /> New PO
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white h-10">
        {(["suppliers", "pos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 text-xs font-black transition-all", tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}>
            {t === "suppliers" ? `Suppliers (${suppliers.length})` : `Purchase Orders (${pos.length})`}
          </button>
        ))}
      </div>

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            : suppliers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                No suppliers yet. Add your first supplier to start tracking purchases.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <div key={s.id} className="p-4 flex items-start gap-4">
                    <div className="p-2 bg-orange-50 rounded-xl mt-0.5">
                      <Building2 className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                        {s.contact_name && <span>{s.contact_name}</span>}
                        {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                        {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                        {s.payment_terms && <span className="px-2 py-0.5 bg-slate-100 rounded-lg font-medium text-slate-500">{s.payment_terms}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEditSupplier(s)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => void handleDeleteSupplier(s.id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* POs Tab */}
      {tab === "pos" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
            : pos.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                No purchase orders yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pos.map((po) => (
                  <div key={po.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-sm">{po.po_number}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", PO_STATUS_COLORS[po.status] ?? "bg-slate-100 text-slate-500")}>{po.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{po.supplier?.name} · {format(parseISO(po.order_date), "d MMM yyyy")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">₹{Number(po.total_amount).toFixed(2)}</span>
                        {po.status === "DRAFT" || po.status === "SENT" ? (
                          <Button size="sm" onClick={() => void handleReceivePO(po)}
                            className="h-7 px-3 rounded-lg text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white">
                            Mark Received
                          </Button>
                        ) : po.status === "RECEIVED" ? (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-black">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Received {po.received_date ? format(parseISO(po.received_date), "d MMM") : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {po.lines.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {po.lines.map((line) => (
                          <span key={line.id} className="px-2 py-0.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                            {line.ingredient.name}: {Number(line.quantity)}{line.ingredient.unit} @ ₹{Number(line.unit_cost)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">{editingSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier Name *</Label>
            <Input value={sForm.name} onChange={(e) => setSForm((p) => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Name</Label>
              <Input value={sForm.contact_name} onChange={(e) => setSForm((p) => ({ ...p, contact_name: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</Label>
              <Input value={sForm.phone} onChange={(e) => setSForm((p) => ({ ...p, phone: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</Label>
              <Input value={sForm.email} onChange={(e) => setSForm((p) => ({ ...p, email: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">GST Number</Label>
              <Input value={sForm.gst_number} onChange={(e) => setSForm((p) => ({ ...p, gst_number: e.target.value.toUpperCase() }))} className="h-10 rounded-xl" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payment Terms</Label>
              <Input value={sForm.payment_terms} onChange={(e) => setSForm((p) => ({ ...p, payment_terms: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Net 30, COD" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setSupplierDialog(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSaveSupplier()} disabled={saving}>{saving ? "Saving..." : editingSupplier ? "Update" : "Add Supplier"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New PO Dialog */}
      <Dialog open={poDialog} onOpenChange={setPoDialog}>
        <DialogContent className="max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="text-base font-black uppercase tracking-tight">New Purchase Order</DialogTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier *</Label>
              <select value={poSupplierId} onChange={(e) => setPoSupplierId(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 text-sm px-3 bg-white">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expected Date</Label>
              <Input type="date" value={poExpected} onChange={(e) => setPoExpected(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Line Items</Label>
            {poLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                <select value={line.ingredient_id} onChange={(e) => updatePoLine(idx, "ingredient_id", e.target.value)}
                  className="flex-1 h-8 rounded-lg border border-slate-200 text-xs px-2 bg-white min-w-0">
                  <option value="">Select ingredient...</option>
                  {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
                <Input type="number" value={line.quantity} onChange={(e) => updatePoLine(idx, "quantity", e.target.value)} className="h-8 w-16 text-xs rounded-lg" placeholder="Qty" min={0.01} />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₹</span>
                  <Input type="number" value={line.unit_cost} onChange={(e) => updatePoLine(idx, "unit_cost", e.target.value)} className="h-8 w-20 text-xs rounded-lg pl-5" placeholder="Cost" min={0} />
                </div>
                <button onClick={() => setPoLines((p) => p.filter((_, i) => i !== idx))} disabled={poLines.length === 1}
                  className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center disabled:opacity-30">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button onClick={() => setPoLines((p) => [...p, { ingredient_id: "", quantity: "1", unit_cost: "0" }])}
              className="w-full h-8 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5">
              <Plus className="h-3 w-3" /> Add Line
            </button>
          </div>

          <div className="flex items-center justify-between text-sm font-black text-slate-700">
            <span>Total</span>
            <span>₹{poTotal.toFixed(2)}</span>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes (optional)</Label>
            <Input value={poNotes} onChange={(e) => setPoNotes(e.target.value)} className="h-10 rounded-xl" placeholder="Internal notes" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setPoDialog(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleCreatePO()} disabled={poSaving}>{poSaving ? "Creating..." : "Create PO"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
