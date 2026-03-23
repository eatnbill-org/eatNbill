import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardList, Plus, ChevronDown, ChevronRight, Check,
  Truck, X, AlertCircle, PackageCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { formatINR } from "@/lib/format";

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: string;
}

interface POLine {
  ingredient_id: string;
  quantity: string;
  unit_cost: string;
  // from API response:
  id?: string;
  ingredient?: { name: string; unit: string };
  total_cost?: string;
  received_qty?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: "DRAFT" | "SENT" | "RECEIVED" | "CANCELLED";
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  total_amount: string;
  notes: string | null;
  supplier: { name: string };
  lines: {
    id: string;
    quantity: string;
    unit_cost: string;
    total_cost: string;
    received_qty: string;
    ingredient: { name: string; unit: string };
  }[];
}

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  DRAFT: { label: "Draft", class: "bg-slate-100 text-slate-600" },
  SENT: { label: "Sent", class: "bg-blue-100 text-blue-700" },
  RECEIVED: { label: "Received", class: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelled", class: "bg-rose-100 text-rose-600" },
};

function fmtDate(iso: string) {
  return format(parseISO(iso), "dd MMM yyyy");
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = React.useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [receiving, setReceiving] = React.useState<string | null>(null);

  // Create form
  const [fSupplierId, setFSupplierId] = React.useState("");
  const [fExpectedDate, setFExpectedDate] = React.useState("");
  const [fNotes, setFNotes] = React.useState("");
  const [fLines, setFLines] = React.useState<POLine[]>([
    { ingredient_id: "", quantity: "1", unit_cost: "0" },
  ]);

  const load = async () => {
    setLoading(true);
    try {
      const [ordRes, supRes, ingRes] = await Promise.all([
        apiClient.get<{ data: PurchaseOrder[] }>("/restaurant/purchase-orders"),
        apiClient.get<{ data: Supplier[] }>("/restaurant/suppliers"),
        apiClient.get<{ data: Ingredient[] }>("/restaurant/inventory/ingredients"),
      ]);
      setOrders((ordRes.data as any)?.data ?? []);
      setSuppliers((supRes.data as any)?.data ?? []);
      setIngredients((ingRes.data as any)?.data ?? []);
    } catch {
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const addLine = () => {
    setFLines((l) => [...l, { ingredient_id: "", quantity: "1", unit_cost: "0" }]);
  };

  const removeLine = (i: number) => {
    setFLines((l) => l.filter((_, idx) => idx !== i));
  };

  const updateLine = (i: number, field: keyof POLine, value: string) => {
    setFLines((l) => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line));
  };

  const handleIngredientSelect = (lineIdx: number, ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    setFLines((l) => l.map((line, idx) =>
      idx === lineIdx
        ? { ...line, ingredient_id: ingredientId, unit_cost: ing ? String(ing.cost_per_unit) : "0" }
        : line
    ));
  };

  const handleCreate = async () => {
    if (!fSupplierId) { toast.error("Select a supplier"); return; }
    const validLines = fLines.filter((l) => l.ingredient_id && Number(l.quantity) > 0);
    if (validLines.length === 0) { toast.error("Add at least one item"); return; }

    setSaving(true);
    try {
      await apiClient.post("/restaurant/purchase-orders", {
        supplier_id: fSupplierId,
        expected_date: fExpectedDate || undefined,
        notes: fNotes || undefined,
        lines: validLines.map((l) => ({
          ingredient_id: l.ingredient_id,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost),
        })),
      });
      toast.success("Purchase order created");
      setCreateOpen(false);
      setFSupplierId(""); setFExpectedDate(""); setFNotes("");
      setFLines([{ ingredient_id: "", quantity: "1", unit_cost: "0" }]);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  const handleReceive = async (id: string) => {
    setReceiving(id);
    try {
      await apiClient.patch(`/restaurant/purchase-orders/${id}/receive`, {});
      toast.success("Purchase order marked as received — stock updated");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to mark as received");
    } finally {
      setReceiving(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/restaurant/purchase-orders/${id}/status`, { status });
      toast.success(`Status updated to ${status.toLowerCase()}`);
      load();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const totalDraft = orders.filter((o) => o.status === "DRAFT").length;
  const totalPending = orders.filter((o) => o.status === "SENT").length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage supplier orders and stock replenishment</p>
        </div>
        <Button
          className="gap-2 h-10 rounded-xl bg-slate-900 text-white hover:bg-black"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          New PO
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: orders.length, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
          { label: "Draft", value: totalDraft, icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
          { label: "Awaiting Delivery", value: totalPending, icon: Truck, color: "text-purple-600 bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.color)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{s.label}</p>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Orders list */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No purchase orders yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first PO to replenish stock</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {orders.map((po) => {
              const expanded = expandedId === po.id;
              const style = STATUS_STYLES[po.status] ?? STATUS_STYLES.DRAFT;
              return (
                <div key={po.id}>
                  <div
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expanded ? null : po.id)}
                  >
                    <div className="w-6 h-6 flex items-center justify-center text-slate-400">
                      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{po.po_number}</span>
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", style.class)}>
                          {style.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {po.supplier?.name} · {fmtDate(po.order_date)}
                        {po.expected_date && ` · Expected ${fmtDate(po.expected_date)}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900">{formatINR(parseFloat(po.total_amount))}</div>
                      <div className="text-xs text-slate-400">{po.lines?.length ?? 0} items</div>
                    </div>
                    {po.status === "DRAFT" && (
                      <div className="flex gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg"
                          onClick={() => handleStatusChange(po.id, "SENT")}
                        >
                          <Truck className="w-3.5 h-3.5 mr-1" />
                          Send
                        </Button>
                      </div>
                    )}
                    {po.status === "SENT" && (
                      <div className="flex gap-2 ml-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleReceive(po.id)}
                          disabled={receiving === po.id}
                        >
                          <PackageCheck className="w-3.5 h-3.5 mr-1" />
                          {receiving === po.id ? "Processing..." : "Mark Received"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg text-rose-500 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleStatusChange(po.id, "CANCELLED")}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {expanded && (
                    <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                      {po.notes && (
                        <p className="text-xs text-slate-500 italic py-2">{po.notes}</p>
                      )}
                      <table className="w-full text-sm mt-2">
                        <thead>
                          <tr className="text-xs text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                            <th className="text-left py-2">Ingredient</th>
                            <th className="text-right py-2">Qty</th>
                            <th className="text-right py-2">Unit Cost</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {po.lines.map((line) => (
                            <tr key={line.id} className="text-slate-700">
                              <td className="py-2 font-medium">{line.ingredient?.name}</td>
                              <td className="py-2 text-right font-mono">{line.quantity} {line.ingredient?.unit}</td>
                              <td className="py-2 text-right font-mono">{formatINR(parseFloat(line.unit_cost))}</td>
                              <td className="py-2 text-right font-bold">{formatINR(parseFloat(line.total_cost))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-300">
                            <td colSpan={3} className="py-2 font-bold text-slate-600 uppercase text-xs tracking-wider">Total</td>
                            <td className="py-2 text-right font-black text-slate-900">{formatINR(parseFloat(po.total_amount))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create PO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogTitle className="text-xl font-black">New Purchase Order</DialogTitle>

          <div className="space-y-5 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Supplier *</Label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={fSupplierId}
                  onChange={(e) => setFSupplierId(e.target.value)}
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Expected Delivery</Label>
                <Input
                  type="date"
                  value={fExpectedDate}
                  onChange={(e) => setFExpectedDate(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Notes</Label>
              <Input
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                placeholder="Optional notes..."
                className="h-10 rounded-xl"
              />
            </div>

            {/* Line items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Items *</Label>
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={addLine}>
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {fLines.map((line, i) => {
                  const selectedIng = ingredients.find((ing) => ing.id === line.ingredient_id);
                  const lineTotal = (Number(line.quantity) * Number(line.unit_cost)).toFixed(2);
                  return (
                    <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-xl p-3">
                      <select
                        className="flex-1 h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        value={line.ingredient_id}
                        onChange={(e) => handleIngredientSelect(i, e.target.value)}
                      >
                        <option value="">Select ingredient...</option>
                        {ingredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0.001}
                        step={0.001}
                        value={line.quantity}
                        onChange={(e) => updateLine(i, "quantity", e.target.value)}
                        className="w-20 h-9 rounded-lg text-center"
                        placeholder="Qty"
                      />
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unit_cost}
                        onChange={(e) => updateLine(i, "unit_cost", e.target.value)}
                        className="w-24 h-9 rounded-lg text-right"
                        placeholder="Cost"
                      />
                      <span className="text-xs font-bold text-slate-700 w-20 text-right">
                        {formatINR(parseFloat(lineTotal) || 0)}
                      </span>
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition-colors"
                        onClick={() => removeLine(i)}
                        disabled={fLines.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Grand total */}
              <div className="flex justify-end pt-2">
                <span className="text-lg font-black text-slate-900">
                  Total: {formatINR(fLines.reduce((sum, l) => sum + (Number(l.quantity) * Number(l.unit_cost)), 0))}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-slate-900 text-white hover:bg-black"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
