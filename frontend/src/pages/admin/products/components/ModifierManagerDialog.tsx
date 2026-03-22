import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  fetchProductModifiers,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  addModifierOption,
  updateModifierOption,
  deleteModifierOption,
} from '@/lib/enterprise-api';
import type { ProductModifierGroup, ProductModifierOption } from '@/types/product';
import { PlusCircle, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModifierManagerDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

function OptionRow({
  option,
  productId,
  groupId,
  onDelete,
  onUpdate,
}: {
  option: ProductModifierOption;
  productId: string;
  groupId: string;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const [name, setName] = React.useState(option.name);
  const [priceDelta, setPriceDelta] = React.useState(option.price_delta);
  const [editing, setEditing] = React.useState(false);
  const qc = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () =>
      updateModifierOption(productId, groupId, option.id, {
        name,
        price_delta: parseFloat(priceDelta),
      }),
    onSuccess: () => {
      setEditing(false);
      onUpdate();
      void qc.invalidateQueries({ queryKey: ['modifiers', productId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteModifierOption(productId, groupId, option.id),
    onSuccess: () => {
      toast.success('Option deleted');
      onDelete();
      void qc.invalidateQueries({ queryKey: ['modifiers', productId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">{option.name}</span>
          {parseFloat(option.price_delta) !== 0 && (
            <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md', parseFloat(option.price_delta) > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
              {parseFloat(option.price_delta) > 0 ? '+' : ''}₹{parseFloat(option.price_delta).toFixed(2)}
            </span>
          )}
          {option.is_default && (
            <span className="text-[9px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">Default</span>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(true)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Settings2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="h-6 w-6 rounded-md flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-7 text-xs flex-1 rounded-lg"
        placeholder="Option name"
      />
      <Input
        type="number"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        className="h-7 text-xs w-24 rounded-lg"
        placeholder="±price"
      />
      <Button
        size="sm"
        className="h-7 text-xs px-3 rounded-lg"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !name.trim()}
      >
        Save
      </Button>
      <button
        onClick={() => { setName(option.name); setPriceDelta(option.price_delta); setEditing(false); }}
        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100"
      >
        ✕
      </button>
    </div>
  );
}

function GroupPanel({
  group,
  productId,
  onDelete,
}: {
  group: ProductModifierGroup;
  productId: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const [newOptionName, setNewOptionName] = React.useState('');
  const [newOptionPrice, setNewOptionPrice] = React.useState('0');
  const qc = useQueryClient();

  const addOptionMutation = useMutation({
    mutationFn: () =>
      addModifierOption(productId, group.id, {
        name: newOptionName.trim(),
        price_delta: parseFloat(newOptionPrice) || 0,
      }),
    onSuccess: () => {
      setNewOptionName('');
      setNewOptionPrice('0');
      toast.success('Option added');
      void qc.invalidateQueries({ queryKey: ['modifiers', productId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => deleteModifierGroup(productId, group.id),
    onSuccess: () => {
      toast.success('Group deleted');
      onDelete();
      void qc.invalidateQueries({ queryKey: ['modifiers', productId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleRequired = useMutation({
    mutationFn: (val: boolean) => updateModifierGroup(productId, group.id, { is_required: val }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['modifiers', productId] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <button className="text-slate-400">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          <div>
            <p className="text-sm font-bold text-slate-800">{group.name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {group.options.length} option{group.options.length !== 1 ? 's' : ''} · {group.max_select === 1 ? 'Single select' : `Up to ${group.max_select}`}
            </p>
          </div>
          {group.is_required && (
            <span className="text-[9px] font-black uppercase tracking-wide bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-md">Required</span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Required</span>
            <Switch
              checked={group.is_required}
              onCheckedChange={(v) => toggleRequired.mutate(v)}
              className="scale-75"
            />
          </div>
          <button
            onClick={() => deleteGroupMutation.mutate()}
            disabled={deleteGroupMutation.isPending}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {group.options.map((opt) => (
            <OptionRow
              key={opt.id}
              option={opt}
              productId={productId}
              groupId={group.id}
              onDelete={() => void qc.invalidateQueries({ queryKey: ['modifiers', productId] })}
              onUpdate={() => void qc.invalidateQueries({ queryKey: ['modifiers', productId] })}
            />
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              className="h-8 text-xs flex-1 rounded-lg"
              placeholder="New option name (e.g. Large)"
              onKeyDown={(e) => e.key === 'Enter' && newOptionName.trim() && addOptionMutation.mutate()}
            />
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
              <Input
                type="number"
                value={newOptionPrice}
                onChange={(e) => setNewOptionPrice(e.target.value)}
                className="h-8 text-xs w-24 rounded-lg pl-6"
                placeholder="0"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3 rounded-lg"
              onClick={() => addOptionMutation.mutate()}
              disabled={addOptionMutation.isPending || !newOptionName.trim()}
            >
              <PlusCircle className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModifierManagerDialog({ open, onClose, productId, productName }: ModifierManagerDialogProps) {
  const qc = useQueryClient();
  const [newGroupName, setNewGroupName] = React.useState('');
  const [newGroupMaxSelect, setNewGroupMaxSelect] = React.useState('1');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['modifiers', productId],
    queryFn: () => fetchProductModifiers(productId),
    enabled: open && !!productId,
  });

  const createGroupMutation = useMutation({
    mutationFn: () =>
      createModifierGroup(productId, {
        name: newGroupName.trim(),
        is_required: false,
        min_select: 0,
        max_select: parseInt(newGroupMaxSelect) || 1,
      }),
    onSuccess: () => {
      setNewGroupName('');
      setNewGroupMaxSelect('1');
      toast.success('Modifier group created');
      void qc.invalidateQueries({ queryKey: ['modifiers', productId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-base font-black uppercase tracking-tight">
          Modifiers — {productName}
        </DialogTitle>

        <p className="text-xs text-slate-500">
          Modifier groups let customers customize their order (e.g. Size, Toppings, Spice Level). Each group can be single-select or multi-select.
        </p>

        {isLoading ? (
          <div className="py-6 text-center text-slate-400 text-sm">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-xs">No modifier groups yet. Create one below.</div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <GroupPanel
                key={group.id}
                group={group}
                productId={productId}
                onDelete={() => void qc.invalidateQueries({ queryKey: ['modifiers', productId] })}
              />
            ))}
          </div>
        )}

        {/* Add new group */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Add Modifier Group</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Group Name</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Size, Toppings, Spice Level"
                className="h-9 rounded-xl text-sm"
                onKeyDown={(e) => e.key === 'Enter' && newGroupName.trim() && createGroupMutation.mutate()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max Selections</Label>
              <Input
                type="number"
                value={newGroupMaxSelect}
                onChange={(e) => setNewGroupMaxSelect(e.target.value)}
                className="h-9 rounded-xl text-sm"
                min={1}
                max={20}
              />
            </div>
          </div>
          <Button
            className="w-full rounded-xl gap-2"
            onClick={() => createGroupMutation.mutate()}
            disabled={createGroupMutation.isPending || !newGroupName.trim()}
          >
            <PlusCircle className="h-4 w-4" />
            {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
          </Button>
        </div>

        <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
