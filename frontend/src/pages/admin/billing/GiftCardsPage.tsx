import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Gift, PlusCircle, Copy, Ban, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatINR } from "@/lib/format";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GiftCard {
  id: string;
  code: string;
  initial_value: string;
  remaining_value: string;
  issued_to: string | null;
  issued_at: string;
  expires_at: string | null;
  is_active: boolean;
}

async function fetchGiftCards() {
  const { data } = await apiClient.get<{ data: GiftCard[] }>('/restaurant/gift-cards');
  return (data as any)?.data as GiftCard[] ?? [];
}

function IssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = React.useState('');
  const [value, setValue] = React.useState('');
  const [issuedTo, setIssuedTo] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/restaurant/gift-cards', {
        code: code.trim().toUpperCase(),
        initial_value: parseFloat(value),
        issued_to: issuedTo.trim() || undefined,
        expires_at: expiresAt || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Gift card issued');
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to issue gift card'),
  });

  // Reset on open
  React.useEffect(() => {
    if (open) {
      setCode('');
      setValue('');
      setIssuedTo('');
      setExpiresAt('');
    }
  }, [open]);

  const handleGenerate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rand = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setCode(`GC-${rand}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 space-y-5">
        <DialogTitle className="text-lg font-black">Issue Gift Card</DialogTitle>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Code</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. GC-HAPPY2024"
                className="font-mono font-bold"
              />
              <Button type="button" variant="outline" onClick={handleGenerate} className="shrink-0 text-xs font-bold">
                Generate
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Value (₹)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="500"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issued To (optional)</Label>
            <Input
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
              placeholder="Customer name or email"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            className="flex-1 font-bold"
            disabled={!code.trim() || !value || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Issuing...' : 'Issue Gift Card'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GiftCardsPage() {
  const queryClient = useQueryClient();
  const [issueOpen, setIssueOpen] = React.useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: fetchGiftCards,
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/restaurant/gift-cards/${id}/deactivate`),
    onSuccess: () => {
      toast.success('Gift card deactivated');
      queryClient.invalidateQueries({ queryKey: ['gift-cards'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  const activeCards = cards.filter((c) => c.is_active);
  const totalIssued = cards.reduce((sum, c) => sum + parseFloat(c.initial_value), 0);
  const totalRedeemed = cards.reduce((sum, c) => sum + (parseFloat(c.initial_value) - parseFloat(c.remaining_value)), 0);
  const totalOutstanding = activeCards.reduce((sum, c) => sum + parseFloat(c.remaining_value), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gift Cards</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Issue and manage gift card balances</p>
        </div>
        <Button onClick={() => setIssueOpen(true)} className="gap-2 font-bold">
          <PlusCircle className="h-4 w-4" />
          Issue Gift Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Issued', value: formatINR(totalIssued), icon: Gift, color: 'text-blue-600 bg-blue-50' },
          { label: 'Redeemed', value: formatINR(totalRedeemed), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Outstanding', value: formatINR(totalOutstanding), icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
            <div className={cn('p-2 rounded-xl', color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-slate-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Gift className="h-8 w-8 animate-pulse" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
            <Gift className="h-10 w-10 text-slate-200" />
            <p className="text-sm font-bold">No gift cards issued yet</p>
            <Button size="sm" variant="outline" onClick={() => setIssueOpen(true)}>Issue your first gift card</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</th>
                <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Issued To</th>
                <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Value</th>
                <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</th>
                <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Expires</th>
                <th className="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => {
                const remaining = parseFloat(card.remaining_value);
                const initial = parseFloat(card.initial_value);
                const pctLeft = initial > 0 ? (remaining / initial) * 100 : 0;
                const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
                const isFullyRedeemed = remaining <= 0;

                return (
                  <tr key={card.id} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-800 text-sm">{card.code}</span>
                        <button onClick={() => copyCode(card.code)} className="text-slate-300 hover:text-slate-600 transition-colors">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-600 font-medium">{card.issued_to || <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-slate-700">{formatINR(initial)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("font-black text-sm", pctLeft > 50 ? "text-emerald-600" : pctLeft > 20 ? "text-amber-600" : "text-rose-600")}>
                          {formatINR(remaining)}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pctLeft > 50 ? "bg-emerald-400" : pctLeft > 20 ? "bg-amber-400" : "bg-rose-400")}
                            style={{ width: `${pctLeft}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {card.expires_at ? (
                        <span className={cn("text-xs font-bold", isExpired ? "text-rose-600" : "text-slate-500")}>
                          {format(new Date(card.expires_at), 'd MMM yyyy')}
                          {isExpired && ' (expired)'}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs font-bold">No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {!card.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Deactivated</span>
                      ) : isFullyRedeemed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Used up</span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">Expired</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {card.is_active && !isFullyRedeemed && (
                        <button
                          onClick={() => {
                            if (confirm(`Deactivate gift card ${card.code}?`)) {
                              deactivateMutation.mutate(card.id);
                            }
                          }}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                          title="Deactivate"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <IssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}
