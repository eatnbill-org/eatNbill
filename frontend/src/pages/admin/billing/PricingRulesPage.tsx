import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Plus, Trash2, Edit2, Tag, Percent, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PricingRule {
  id: string;
  name: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  applicable_to: "ALL" | "CATEGORY" | "PRODUCT";
  is_active: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyRule = (): Omit<PricingRule, "id"> => ({
  name: "",
  discount_type: "PERCENTAGE",
  discount_value: "10",
  days_of_week: [],
  start_time: "15:00",
  end_time: "18:00",
  applicable_to: "ALL",
  is_active: true,
});

export default function PricingRulesPage() {
  const [rules, setRules] = React.useState<PricingRule[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PricingRule | null>(null);
  const [form, setForm] = React.useState(emptyRule());
  const [saving, setSaving] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: PricingRule[] }>("/restaurant/pricing-rules");
      setRules((res.data as any)?.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyRule()); setDialogOpen(true); };
  const openEdit = (r: PricingRule) => {
    setEditing(r);
    setForm({ name: r.name, discount_type: r.discount_type, discount_value: String(r.discount_value), days_of_week: r.days_of_week, start_time: r.start_time, end_time: r.end_time, applicable_to: r.applicable_to, is_active: r.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Rule name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await apiClient.patch(`/restaurant/pricing-rules/${editing.id}`, form);
        toast.success("Rule updated");
      } else {
        await apiClient.post("/restaurant/pricing-rules", form);
        toast.success("Rule created");
      }
      setDialogOpen(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/restaurant/pricing-rules/${id}`);
      toast.success("Rule deleted");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleToggle = async (r: PricingRule) => {
    try {
      await apiClient.patch(`/restaurant/pricing-rules/${r.id}`, { is_active: !r.is_active });
      void load();
    } catch {
      // ignore
    }
  };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Happy Hour & Pricing Rules
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Auto-apply discounts during specific times or days</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2 h-9 text-xs font-bold">
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </Button>
      </div>

      {/* Rules list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            No pricing rules yet. Create one to apply happy hour or time-based discounts.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-start gap-4">
                <div className={cn("mt-0.5 p-2 rounded-xl", rule.is_active ? "bg-amber-50" : "bg-slate-50")}>
                  <Clock className={cn("h-4 w-4", rule.is_active ? "text-amber-500" : "text-slate-300")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 text-sm">{rule.name}</p>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", rule.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400")}>
                      {rule.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      {rule.discount_type === "PERCENTAGE" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                      {rule.discount_type === "PERCENTAGE" ? `${rule.discount_value}% off` : `₹${rule.discount_value} off`}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />{rule.start_time} – {rule.end_time}
                    </span>
                    {rule.days_of_week.length > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {rule.days_of_week.map((d) => DAYS[d]).join(", ")}
                        </span>
                      </>
                    )}
                    {rule.days_of_week.length === 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">Every day</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rule.is_active} onCheckedChange={() => void handleToggle(rule)} />
                  <button onClick={() => openEdit(rule)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this pricing rule?")) void handleDelete(rule.id); }} className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center">
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
            {editing ? "Edit Pricing Rule" : "New Pricing Rule"}
          </DialogTitle>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rule Name</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" placeholder="e.g. Happy Hour, Weekend Special" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Discount Type</Label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden h-10">
                {(["PERCENTAGE", "FLAT"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, discount_type: t }))}
                    className={cn("flex-1 text-xs font-bold transition-all", form.discount_type === t ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>
                    {t === "PERCENTAGE" ? "%" : "₹ Flat"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Value {form.discount_type === "PERCENTAGE" ? "(%)" : "(₹)"}
              </Label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))} className="h-10 rounded-xl" min={0.01} step={0.01} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Days of Week (empty = every day)</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={cn("h-8 px-3 rounded-lg text-xs font-bold transition-all", form.days_of_week.includes(i) ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <span className="text-sm font-semibold text-slate-700">Active</span>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
