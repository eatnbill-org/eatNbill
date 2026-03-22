import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchProductModifiers } from '@/lib/enterprise-api';
import type { Product } from '@/types/product';
import type { ProductModifierGroup, ProductModifierOption } from '@/types/product';
import { cn } from '@/lib/utils';
import { Check, ShoppingCart } from 'lucide-react';
import { formatINR } from '@/lib/format';

interface ModifierPickerDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  basePrice: number; // discounted base price
  onConfirm: (selectedOptionIds: string[], totalPrice: number) => void;
}

export function ModifierPickerDialog({ open, onClose, product, basePrice, onConfirm }: ModifierPickerDialogProps) {
  const [selections, setSelections] = React.useState<Record<string, Set<string>>>({});

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['modifiers', product?.id],
    queryFn: () => fetchProductModifiers(product!.id),
    enabled: open && !!product?.id,
  });

  // Reset selections when dialog opens for a new product
  React.useEffect(() => {
    if (open && product) {
      const initial: Record<string, Set<string>> = {};
      // Will be populated after groups load
      setSelections(initial);
    }
  }, [open, product?.id]);

  // Set defaults after groups load
  React.useEffect(() => {
    if (groups.length > 0) {
      const initial: Record<string, Set<string>> = {};
      for (const group of groups) {
        const defaults = group.options.filter((o) => o.is_default && o.is_active).map((o) => o.id);
        initial[group.id] = new Set(defaults);
      }
      setSelections(initial);
    }
  }, [groups]);

  const toggleOption = (group: ProductModifierGroup, option: ProductModifierOption) => {
    setSelections((prev) => {
      const current = new Set(prev[group.id] ?? []);
      if (group.max_select === 1) {
        // Single select / radio
        return { ...prev, [group.id]: new Set([option.id]) };
      }
      // Multi-select
      if (current.has(option.id)) {
        current.delete(option.id);
      } else {
        if (current.size < group.max_select) {
          current.add(option.id);
        }
      }
      return { ...prev, [group.id]: current };
    });
  };

  const allOptionIds = Object.values(selections).flatMap((s) => Array.from(s));

  const modifiersDelta = React.useMemo(() => {
    if (!groups.length) return 0;
    let delta = 0;
    for (const group of groups) {
      const sel = selections[group.id];
      if (!sel) continue;
      for (const optId of sel) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) delta += parseFloat(opt.price_delta);
      }
    }
    return delta;
  }, [groups, selections]);

  const totalPrice = basePrice + modifiersDelta;

  const requiredGroupsMet = groups
    .filter((g) => g.is_required)
    .every((g) => (selections[g.id]?.size ?? 0) >= (g.min_select || 1));

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100">
          <DialogTitle className="text-base font-black text-slate-900 tracking-tight">{product.name}</DialogTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-indigo-600">{formatINR(totalPrice)}</span>
            {modifiersDelta !== 0 && (
              <span className="text-xs text-slate-400">
                ({modifiersDelta > 0 ? '+' : ''}{formatINR(modifiersDelta)})
              </span>
            )}
          </div>
        </div>

        {/* Groups */}
        <div className="overflow-y-auto max-h-[50vh] px-5 py-4 space-y-5">
          {isLoading ? (
            <div className="py-4 text-center text-slate-400 text-sm">Loading options...</div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">No customizations available.</p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">{group.name}</p>
                  <div className="flex gap-1">
                    {group.is_required && (
                      <span className="text-[9px] font-black uppercase bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md">Required</span>
                    )}
                    {group.max_select > 1 && (
                      <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md">Up to {group.max_select}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {group.options.filter((o) => o.is_active).map((option) => {
                    const isSelected = selections[group.id]?.has(option.id) ?? false;
                    const priceDelta = parseFloat(option.price_delta);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(group, option)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/60'
                            : 'border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-4 w-4 rounded flex items-center justify-center border-2 transition-all',
                              group.max_select === 1 ? 'rounded-full' : 'rounded',
                              isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'
                            )}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <span className={cn('text-sm font-semibold', isSelected ? 'text-indigo-800' : 'text-slate-700')}>
                            {option.name}
                          </span>
                        </div>
                        {priceDelta !== 0 && (
                          <span className={cn('text-xs font-bold', priceDelta > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                            {priceDelta > 0 ? '+' : ''}{formatINR(priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl h-11 gap-2"
            disabled={!requiredGroupsMet}
            onClick={() => { onConfirm(allOptionIds, totalPrice); onClose(); }}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
