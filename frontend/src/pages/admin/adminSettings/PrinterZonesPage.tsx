import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Printer, Pencil, Trash2, Settings2 } from "lucide-react";

interface PrinterZone {
  id: string;
  name: string;
  description: string | null;
  category_ids: string[];
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

async function fetchPrinterZones(): Promise<PrinterZone[]> {
  const { data } = await apiClient.get<{ data: PrinterZone[] }>("/restaurant/printer-zones");
  return (data as any)?.data ?? [];
}

async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<{ data: Category[] }>("/restaurant/categories");
  return (data as any)?.data ?? [];
}

function ZoneDialog({
  open,
  onClose,
  initial,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  initial?: PrinterZone | null;
  categories: Category[];
}) {
  const queryClient = useQueryClient();
  const isEdit = !!initial;

  const [name, setName] = React.useState(initial?.name ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>(
    initial?.category_ids ?? []
  );
  const [isActive, setIsActive] = React.useState(initial?.is_active ?? true);

  // Reset form when dialog opens with new initial value
  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setSelectedCategoryIds(initial?.category_ids ?? []);
      setIsActive(initial?.is_active ?? true);
    }
  }, [open, initial]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category_ids: selectedCategoryIds,
        is_active: isActive,
      };
      if (isEdit && initial) {
        const { error } = await apiClient.patch(`/restaurant/printer-zones/${initial.id}`, payload);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await apiClient.post("/restaurant/printer-zones", payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Printer zone updated" : "Printer zone created");
      void queryClient.invalidateQueries({ queryKey: ["printer-zones"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
        <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          {isEdit ? "Edit Printer Zone" : "New Printer Zone"}
        </DialogTitle>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Zone Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kitchen, Bar, Grill"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Description (optional)
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this zone"
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Assigned Categories
            </Label>
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No categories available.</p>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                      id={`cat-${cat.id}`}
                    />
                    <span className="text-sm text-slate-700 select-none">{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-700">Active</p>
              <p className="text-[10px] text-slate-400">Enable KOT routing for this zone</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !name.trim()}
          >
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Zone"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PrinterZonesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PrinterZone | null>(null);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["printer-zones"],
    queryFn: fetchPrinterZones,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await apiClient.patch(`/restaurant/printer-zones/${id}`, { is_active });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["printer-zones"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.delete(`/restaurant/printer-zones/${id}`);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Printer zone deleted");
      void queryClient.invalidateQueries({ queryKey: ["printer-zones"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (zone: PrinterZone) => {
    setEditTarget(zone);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-500" />
            Printer Zone Routing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Route KOT tickets to different printers by product category
          </p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openCreate}>
          <PlusCircle className="h-4 w-4" />
          Add Printer Zone
        </Button>
      </div>

      {/* Zone List */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : zones.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No printer zones configured. Add one to start routing KOT tickets.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {zones.map((zone) => {
              const assignedCategories = zone.category_ids
                .map((id) => categoryMap.get(id))
                .filter(Boolean) as string[];

              return (
                <div
                  key={zone.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  {/* Zone info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="font-semibold text-slate-800 text-sm leading-tight">
                      {zone.name}
                    </p>
                    {zone.description && (
                      <p className="text-xs text-slate-400">{zone.description}</p>
                    )}
                    {assignedCategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {assignedCategories.map((catName) => (
                          <span
                            key={catName}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100"
                          >
                            {catName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No categories assigned</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={zone.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: zone.id, is_active: checked })
                      }
                    />
                    <button
                      onClick={() => openEdit(zone)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Edit zone"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(zone.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete zone"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ZoneDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditTarget(null);
        }}
        initial={editTarget}
        categories={categories}
      />
    </div>
  );
}
