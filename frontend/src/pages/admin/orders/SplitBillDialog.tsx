import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { formatINR } from '@/lib/format';
import type { Order } from '@/types/order';
import { cn } from '@/lib/utils';
import { Banknote, QrCode, CreditCard, Wallet, CheckCircle2, SplitSquareVertical, Users, X, Plus, Trash2 } from 'lucide-react';

interface SplitBillDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllPaid?: () => void;
}

interface SplitEntry {
  id: string; // temp client id
  payer_label: string;
  amount: string;
  payment_method: string;
  paid: boolean;
  splitId?: string; // server id after creation
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'UPI', label: 'UPI', icon: QrCode },
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'OTHER', label: 'Other', icon: Wallet },
];

export default function SplitBillDialog({ order, open, onOpenChange, onAllPaid }: SplitBillDialogProps) {
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [numWays, setNumWays] = useState('2');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(false);
  const [serverSplits, setServerSplits] = useState<{ id: string; payer_label: string; amount: string; payment_status: string; payment_method: string | null }[]>([]);

  const total = order ? parseFloat(order.total_amount) : 0;

  useEffect(() => {
    if (open && order) {
      setCreated(false);
      setServerSplits([]);
      const n = 2;
      setNumWays(String(n));
      generateEqualSplits(n, total);
    }
  }, [open, order]);

  const generateEqualSplits = (n: number, t: number) => {
    const base = Math.floor((t / n) * 100) / 100;
    const remainder = Math.round((t - base * n) * 100) / 100;
    const entries: SplitEntry[] = Array.from({ length: n }, (_, i) => ({
      id: String(i),
      payer_label: `Guest ${i + 1}`,
      amount: i === n - 1 ? String(base + remainder) : String(base),
      payment_method: 'CASH',
      paid: false,
    }));
    setSplits(entries);
  };

  const handleNumWaysChange = (v: string) => {
    const n = Math.max(2, Math.min(10, parseInt(v) || 2));
    setNumWays(String(n));
    generateEqualSplits(n, total);
  };

  const updateSplit = (id: string, field: keyof SplitEntry, value: string | boolean) => {
    setSplits((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const addSplit = () => {
    const existing = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const remaining = Math.max(0, Math.round((total - existing) * 100) / 100);
    setSplits((prev) => [...prev, {
      id: Date.now().toString(),
      payer_label: `Guest ${prev.length + 1}`,
      amount: String(remaining),
      payment_method: 'CASH',
      paid: false,
    }]);
  };

  const removeSplit = (id: string) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const totalAssigned = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const diff = Math.round((totalAssigned - total) * 100) / 100;

  const handleCreateSplits = async () => {
    if (!order) return;
    if (Math.abs(diff) > 0.01) { toast.error('Split amounts must equal the order total'); return; }
    setSaving(true);
    try {
      const res = await apiClient.post<{ data: any[] }>(`/orders/${order.id}/splits`, {
        split_type: 'EQUAL',
        splits: splits.map((s) => ({ payer_label: s.payer_label, amount: parseFloat(s.amount) || 0 })),
      });
      const data = (res.data as any)?.data ?? [];
      setServerSplits(data.map((d: any) => ({
        id: d.id,
        payer_label: d.payer_label,
        amount: String(d.amount),
        payment_status: d.payment_status,
        payment_method: d.payment_method,
      })));
      // Copy payment methods from local splits by index
      setSplits((prev) => prev.map((s, i) => ({ ...s, splitId: data[i]?.id })));
      setCreated(true);
      toast.success('Splits created — collect payment for each guest');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create splits');
    } finally {
      setSaving(false);
    }
  };

  const handlePaySplit = async (split: SplitEntry) => {
    if (!order || !split.splitId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/orders/${order.id}/splits/${split.splitId}`, {
        payment_method: split.payment_method,
        payment_status: 'PAID',
      });
      setSplits((prev) => prev.map((s) => s.id === split.id ? { ...s, paid: true } : s));
      setServerSplits((prev) => prev.map((s) => s.id === split.splitId ? { ...s, payment_status: 'PAID' } : s));
      toast.success(`${split.payer_label} — payment collected`);

      const allPaid = splits.every((s) => s.id === split.id ? true : s.paid);
      if (allPaid) {
        toast.success('All splits paid — order complete!');
        onAllPaid?.();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg p-0 border-none shadow-2xl rounded-3xl mx-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-5 pt-5 pb-7 text-white">
          <div className="flex items-center justify-between mb-1">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <SplitSquareVertical className="h-5 w-5 text-indigo-300" />
              Split Bill
            </DialogTitle>
            <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full text-white/50 hover:text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-indigo-200 text-xs font-medium">#{order.order_number} · Total: {formatINR(total)}</p>
        </div>

        <div className="bg-white rounded-t-3xl -mt-3 px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {!created ? (
            <>
              {/* Equal split config */}
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Split equally between</Label>
                <Input
                  type="number"
                  value={numWays}
                  onChange={(e) => handleNumWaysChange(e.target.value)}
                  className="h-9 w-16 text-center font-black rounded-xl border-indigo-200"
                  min={2} max={10}
                />
                <span className="text-xs text-slate-400 font-medium">guests</span>
              </div>

              {/* Split rows */}
              <div className="space-y-2">
                {splits.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Input
                      value={s.payer_label}
                      onChange={(e) => updateSplit(s.id, 'payer_label', e.target.value)}
                      className="h-8 text-xs font-bold flex-1 bg-white rounded-lg border-slate-200"
                      placeholder="Guest name"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black">₹</span>
                      <Input
                        type="number"
                        value={s.amount}
                        onChange={(e) => updateSplit(s.id, 'amount', e.target.value)}
                        className="h-8 w-24 pl-5 text-right text-xs font-black bg-white rounded-lg border-slate-200"
                        min={0}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSplit(s.id)}
                      disabled={splits.length <= 2}
                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSplit}
                className="w-full h-9 rounded-xl border border-dashed border-indigo-200 text-indigo-500 text-xs font-black hover:bg-indigo-50 flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Add Payer
              </button>

              {/* Total check */}
              <div className={cn("text-xs font-black text-right", Math.abs(diff) > 0.01 ? 'text-rose-500' : 'text-emerald-600')}>
                Assigned: {formatINR(totalAssigned)}
                {Math.abs(diff) > 0.01 && ` · ${diff > 0 ? '+' : ''}${formatINR(diff)} difference`}
              </div>

              <Button
                onClick={() => void handleCreateSplits()}
                disabled={saving || Math.abs(diff) > 0.01}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
              >
                {saving ? 'Creating...' : 'Create Splits'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 font-medium">Collect payment from each guest separately.</p>
              <div className="space-y-3">
                {splits.map((s) => (
                  <div key={s.id} className={cn("p-3 rounded-xl border", s.paid ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200')}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black text-slate-800">{s.payer_label}</span>
                      <span className={cn("font-black text-sm", s.paid ? 'text-emerald-600' : 'text-slate-900')}>{formatINR(parseFloat(s.amount))}</span>
                    </div>
                    {s.paid ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1 flex-1">
                          {PAYMENT_METHODS.map((pm) => (
                            <button
                              key={pm.value}
                              type="button"
                              onClick={() => updateSplit(s.id, 'payment_method', pm.value)}
                              className={cn(
                                "flex-1 h-7 rounded-lg text-[9px] font-black transition-all",
                                s.payment_method === pm.value
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              )}
                            >
                              {pm.label}
                            </button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          onClick={() => void handlePaySplit(s)}
                          disabled={saving}
                          className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shrink-0"
                        >
                          Collect
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
