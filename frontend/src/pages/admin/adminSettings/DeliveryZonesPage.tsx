import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapPin, Plus, Trash2, Edit2, Truck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface DeliveryZone {
  id: string;
  name: string;
  radius_km: string | null;
  delivery_fee: string;
  min_order_amount: string | null;
  eta_minutes: number | null;
  is_active: boolean;
  sort_order: number;
}

const emptyZone = () => ({
  name: "",
  radius_km: "",
  delivery_fee: "0",
  min_order_amount: "",
  eta_minutes: "",
  is_active: true,
  sort_order: "0",
});

export default function DeliveryZonesPage() {
  const [zones, setZones] = React.useState<DeliveryZone[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeliveryZone | null>(null);
  const [form, setForm] = React.useState(emptyZone());
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: DeliveryZone[] }>("/restaurant/delivery-zones");
      setZones((res.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const updateForm = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => { setEditing(null); setForm(emptyZone()); setDialogOpen(true); };
  const openEdit = (z: DeliveryZone) => {
    setEditing(z);
    setForm({
      name: z.name,
      radius_km: z.radius_km ?? "",
      delivery_fee: String(z.delivery_fee),
      min_order_amount: z.min_order_amount ?? "",
      eta_minutes: z.eta_minutes !== null ? String(z.eta_minutes) : "",
      is_active: z.is_active,
      sort_order: String(z.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Zone name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        radius_km: form.radius_km ? parseFloat(form.radius_km) : null,
        delivery_fee: parseFloat(form.delivery_fee) || 0,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
        eta_minutes: form.eta_minutes ? parseInt(form.eta_minutes) : null,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (editing) {
        await apiClient.patch(`/restaurant/delivery-zones/${editing.id}`, payload);
        toast.success("Zone updated");
      } else {
        await apiClient.post("/restaurant/delivery-zones", payload);
        toast.success("Zone created");
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
    if (!confirm("Delete this delivery zone?")) return;
    try {
      await apiClient.delete(`/restaurant/delivery-zones/${id}`);
      toast.success("Zone deleted");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleToggle = async (z: DeliveryZone) => {
    try {
      await apiClient.patch(`/restaurant/delivery-zones/${z.id}`, { is_active: !z.is_active });
      void load();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-sky-500" />
            Delivery Zones
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Define delivery areas, fees, and estimated delivery times</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2 h-9 text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> Add Zone
        </Button>
      </div>

      {/* Zones list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : zones.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            No delivery zones configured. Add zones to enable delivery ordering.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {zones.map((zone) => (
              <div key={zone.id} className="p-4 flex items-start gap-4">
                <div className={cn("mt-0.5 p-2 rounded-xl", zone.is_active ? "bg-sky-50" : "bg-slate-50")}>
                  <MapPin className={cn("h-4 w-4", zone.is_active ? "text-sky-500" : "text-slate-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{zone.name}</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", zone.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                      {zone.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                    {zone.radius_km && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{zone.radius_km} km radius
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />₹{zone.delivery_fee} delivery fee
                    </span>
                    {zone.min_order_amount && (
                      <span>Min order: ₹{zone.min_order_amount}</span>
                    )}
                    {zone.eta_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{zone.eta_minutes} min ETA
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={zone.is_active} onCheckedChange={() => void handleToggle(zone)} />
                  <button onClick={() => openEdit(zone)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => void handleDelete(zone.id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogTitle className="text-base font-black uppercase tracking-tight">
            {editing ? "Edit Delivery Zone" : "New Delivery Zone"}
          </DialogTitle>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Zone Name</Label>
            <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} className="h-10 rounded-xl" placeholder="e.g. Inner City, Zone A" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Radius (km, optional)</Label>
              <Input type="number" value={form.radius_km} onChange={(e) => updateForm("radius_km", e.target.value)} className="h-10 rounded-xl" min={0} step={0.1} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ETA (minutes)</Label>
              <Input type="number" value={form.eta_minutes} onChange={(e) => updateForm("eta_minutes", e.target.value)} className="h-10 rounded-xl" min={1} placeholder="e.g. 30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Delivery Fee (₹)</Label>
              <Input type="number" value={form.delivery_fee} onChange={(e) => updateForm("delivery_fee", e.target.value)} className="h-10 rounded-xl" min={0} step={0.5} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min Order Amount (₹)</Label>
              <Input type="number" value={form.min_order_amount} onChange={(e) => updateForm("min_order_amount", e.target.value)} className="h-10 rounded-xl" min={0} placeholder="Optional" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-semibold text-slate-700">Zone Active</span>
            <Switch checked={form.is_active as boolean} onCheckedChange={(v) => updateForm("is_active", v)} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Zone" : "Create Zone"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
