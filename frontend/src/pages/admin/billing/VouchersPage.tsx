import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Tag, Trash2, Edit2, Copy } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'FLAT' | 'PERCENTAGE';
  discount_value: string;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

async function fetchVouchers() {
  const { data } = await apiClient.get<{ data: Voucher[] }>('/restaurant/vouchers');
  return (data as any)?.data as Voucher[] ?? [];
}

function VoucherDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Voucher | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!initial;
  const [code, setCode] = React.useState(initial?.code ?? '');
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [discountType, setDiscountType] = React.useState<'FLAT' | 'PERCENTAGE'>(initial?.discount_type ?? 'FLAT');
  const [discountValue, setDiscountValue] = React.useState(initial?.discount_value ?? '');
  const [minOrder, setMinOrder] = React.useState(initial?.min_order_amount ?? '');
  const [maxDiscount, setMaxDiscount] = React.useState(initial?.max_discount_amount ?? '');
  const [usageLimit, setUsageLimit] = React.useState(initial?.usage_limit ? String(initial.usage_limit) : '');
  const [validFrom, setValidFrom] = React.useState(initial?.valid_from ? initial.valid_from.split('T')[0] : '');
  const [validUntil, setValidUntil] = React.useState(initial?.valid_until ? initial.valid_until.split('T')[0] : '');

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: code.toUpperCase().trim(),
        description: description || undefined,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        min_order_amount: minOrder || undefined,
        max_discount_amount: maxDiscount || undefined,
        usage_limit: usageLimit ? parseInt(usageLimit) : undefined,
        valid_from: validFrom || undefined,
        valid_until: validUntil || undefined,
      };
      if (isEdit && initial) {
        const { error } = await apiClient.patch(`/restaurant/vouchers/${initial.id}`, payload);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await apiClient.post('/restaurant/vouchers', payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Voucher updated' : 'Voucher created');
      void queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
        <DialogTitle className="text-base font-black uppercase tracking-tight">
          {isEdit ? 'Edit Voucher' : 'Create Voucher Code'}
        </DialogTitle>
        <div className="grid gap-3 grid-cols-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER20" className="h-10 rounded-xl font-mono font-bold tracking-widest" disabled={isEdit} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FLAT">Flat (₹)</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Value</Label>
            <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'FLAT' ? '50' : '10'} className="h-10 rounded-xl" min={0} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Min Order (₹)</Label>
            <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="Optional" className="h-10 rounded-xl" min={0} />
          </div>
          {discountType === 'PERCENTAGE' && (
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Discount (₹)</Label>
              <Input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="Cap amount" className="h-10 rounded-xl" min={0} />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Usage Limit</Label>
            <Input type="number" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className="h-10 rounded-xl" min={1} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valid From</Label>
            <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valid Until</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this voucher..." className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 rounded-xl" onClick={() => mutation.mutate()} disabled={mutation.isPending || !code || !discountValue}>
            {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Voucher'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VouchersPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<Voucher | null>(null);

  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ['vouchers'],
    queryFn: fetchVouchers,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await apiClient.patch(`/restaurant/vouchers/${id}`, { is_active });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['vouchers'] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.delete(`/restaurant/vouchers/${id}`);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Voucher deleted');
      void queryClient.invalidateQueries({ queryKey: ['vouchers'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-purple-500" />
            Voucher Codes
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage discount codes for your customers</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={() => { setEditTarget(null); setDialogOpen(true); }}>
          <PlusCircle className="h-4 w-4" /> New Voucher
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : vouchers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No vouchers yet. Create one to get started.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Code</th>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Discount</th>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Usage</th>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Validity</th>
                <th className="text-center px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Active</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black font-mono tracking-widest text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">{v.code}</span>
                      <button
                        onClick={() => { void navigator.clipboard.writeText(v.code); toast.success('Copied!'); }}
                        className="text-slate-300 hover:text-slate-500"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {v.description && <p className="text-xs text-slate-400 mt-0.5">{v.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("font-bold text-sm", v.discount_type === 'FLAT' ? 'text-emerald-600' : 'text-blue-600')}>
                      {v.discount_type === 'FLAT' ? `₹${v.discount_value}` : `${v.discount_value}%`}
                    </span>
                    {v.min_order_amount && <div className="text-[10px] text-slate-400">Min: ₹{v.min_order_amount}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {v.used_count}{v.usage_limit ? `/${v.usage_limit}` : ''} used
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {v.valid_from ? format(new Date(v.valid_from), 'dd/MM/yy') : '∞'}
                    {' – '}
                    {v.valid_until ? format(new Date(v.valid_until), 'dd/MM/yy') : '∞'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={(c) => toggleMutation.mutate({ id: v.id, is_active: c })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditTarget(v); setDialogOpen(true); }}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(v.id)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <VoucherDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        initial={editTarget}
      />
    </div>
  );
}
