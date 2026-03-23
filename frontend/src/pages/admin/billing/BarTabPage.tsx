/**
 * Bar Tab Management — open running tabs for bar guests, add items, close & pay
 * Reuses Order model with source=BAR_TAB, order_type=DINE_IN, status=ACTIVE
 */
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Beer,
  Plus,
  X,
  Clock,
  IndianRupee,
  CreditCard,
  MoveRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import type { Order, OrderItem } from "@/types/order";
import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";

interface Product {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  category?: { name: string };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// ──────────────────────────────────────────────────────
// Open Tab Dialog
// ──────────────────────────────────────────────────────
interface OpenTabDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function OpenTabDialog({ open, onClose, onCreated }: OpenTabDialogProps) {
  const [guestName, setGuestName] = React.useState("");
  const [cardLast4, setCardLast4] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const { data: productsRes } = useQuery<{ data: Product[] }>({
    queryKey: ["bar-products"],
    queryFn: () => apiClient.get("/products?limit=200").then(r => r.data as any),
    enabled: open,
  });
  const products = (productsRes as any)?.data ?? [];

  const [cart, setCart] = React.useState<{ productId: string; name: string; price: number; qty: number }[]>([]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const handleOpen = async () => {
    if (!guestName.trim()) { toast.error("Guest name is required"); return; }
    if (cart.length === 0) { toast.error("Add at least one item"); return; }
    setLoading(true);
    try {
      await apiClient.post("/orders", {
        customer_name: guestName.trim(),
        notes: cardLast4 ? `Card: ****${cardLast4}` : undefined,
        source: "BAR_TAB",
        order_type: "DINE_IN",
        items: cart.map(c => ({ product_id: c.productId, quantity: c.qty })),
      });
      toast.success(`Tab opened for ${guestName.trim()}`);
      setGuestName("");
      setCardLast4("");
      setCart([]);
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to open tab");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-500" /> Open Bar Tab
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {/* Guest Info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Guest Name *</label>
              <Input
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="e.g. John D."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Last 4 (optional)</label>
              <Input
                value={cardLast4}
                onChange={e => setCardLast4(e.target.value.replace(/\D/, "").slice(0, 4))}
                placeholder="1234"
                className="mt-1 font-mono"
                maxLength={4}
              />
            </div>

            {/* Cart */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Initial Items</p>
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No items added yet</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {cart.map(c => (
                    <div key={c.productId} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <span className="font-medium">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">×{c.qty} — {formatINR(c.price * c.qty)}</span>
                        <button type="button" onClick={() => removeFromCart(c.productId)} className="text-slate-300 hover:text-rose-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {cart.length > 0 && (
                <div className="text-right text-sm font-bold text-slate-800 mt-2">Total: {formatINR(total)}</div>
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Add Items</p>
            <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
              {products.filter((p: Product) => p.is_active).map((p: Product) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-xs"
                >
                  <div className="font-semibold text-slate-800 leading-tight truncate">{p.name}</div>
                  <div className="text-slate-500 mt-0.5">{formatINR(p.price)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleOpen}
            disabled={loading || !guestName.trim() || cart.length === 0}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beer className="h-4 w-4" />}
            Open Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────
// Add Items Dialog (for existing tab)
// ──────────────────────────────────────────────────────
interface AddItemsDialogProps {
  open: boolean;
  tab: Order | null;
  onClose: () => void;
  onAdded: () => void;
}

function AddItemsDialog({ open, tab, onClose, onAdded }: AddItemsDialogProps) {
  const [cart, setCart] = React.useState<{ productId: string; name: string; price: number; qty: number }[]>([]);
  const [loading, setLoading] = React.useState(false);

  const { data: productsRes } = useQuery<{ data: Product[] }>({
    queryKey: ["bar-products"],
    queryFn: () => apiClient.get("/products?limit=200").then(r => r.data as any),
    enabled: open,
  });
  const products = (productsRes as any)?.data ?? [];

  React.useEffect(() => { if (!open) setCart([]); }, [open]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.productId === product.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; return next; }
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const handleAdd = async () => {
    if (!tab || cart.length === 0) return;
    setLoading(true);
    try {
      for (const c of cart) {
        await apiClient.post(`/orders/${tab.id}/items`, {
          product_id: c.productId,
          quantity: c.qty,
        });
      }
      toast.success("Items added to tab");
      setCart([]);
      onAdded();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to add items");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Items — {tab?.customer_name ?? "Tab"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
          {products.filter((p: Product) => p.is_active).map((p: Product) => {
            const inCart = cart.find(c => c.productId === p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className={`text-left p-2.5 rounded-xl border transition-all text-xs ${inCart ? "border-primary/40 bg-primary/5" : "border-slate-200 hover:border-primary/30"}`}
              >
                <div className="font-semibold text-slate-800 leading-tight truncate">{p.name}</div>
                <div className="text-slate-500 mt-0.5 flex items-center justify-between">
                  <span>{formatINR(p.price)}</span>
                  {inCart && <span className="font-bold text-primary">×{inCart.qty}</span>}
                </div>
              </button>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div className="text-right text-sm font-bold text-slate-700">
            Adding {cart.reduce((s, c) => s + c.qty, 0)} items — {formatINR(cart.reduce((s, c) => s + c.price * c.qty, 0))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={loading || cart.length === 0} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add to Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────
export default function BarTabPage() {
  const queryClient = useQueryClient();
  const [openTabDialog, setOpenTabDialog] = React.useState(false);
  const [addItemsTab, setAddItemsTab] = React.useState<Order | null>(null);
  const [payTab, setPayTab] = React.useState<Order | null>(null);
  const [view, setView] = React.useState<"active" | "closed">("active");

  const { data: ordersRes, isLoading } = useQuery<{ data: Order[] }>({
    queryKey: ["bar-tabs", view],
    queryFn: async () => {
      const params = new URLSearchParams({
        source: "BAR_TAB",
        ...(view === "active" ? { status: "ACTIVE" } : { status: "COMPLETED" }),
        limit: "100",
      });
      return apiClient.get<{ data: Order[] }>(`/orders?${params.toString()}`).then(r => r.data);
    },
    refetchInterval: 10000,
  });

  const tabs = ordersRes?.data ?? [];

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) =>
      apiClient.patch(`/orders/${orderId}/status`, { status: "CANCELLED" }),
    onSuccess: () => {
      toast.success("Tab cancelled");
      queryClient.invalidateQueries({ queryKey: ["bar-tabs"] });
    },
    onError: () => toast.error("Failed to cancel tab"),
  });

  const activeTabs = tabs.filter(t => t.order_status === "ACTIVE" || t.order_status === "PENDING");
  const totalOpenValue = activeTabs.reduce((s, t) => s + parseFloat(t.total_amount as string), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Beer className="h-6 w-6 text-amber-500" /> Bar Tabs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Open running tabs for bar guests, add drinks, and close when they pay.
          </p>
        </div>
        <Button
          onClick={() => setOpenTabDialog(true)}
          className="gap-2 rounded-xl shadow-md"
        >
          <Plus className="h-4 w-4" /> Open Tab
        </Button>
      </div>

      {/* Stats */}
      {view === "active" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm border border-slate-200 dark:border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl"><Beer className="h-5 w-5 text-amber-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Open Tabs</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeTabs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border border-slate-200 dark:border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl"><IndianRupee className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Outstanding</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{formatINR(totalOpenValue)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View toggle */}
      <Tabs value={view} onValueChange={v => setView(v as "active" | "closed")}>
        <TabsList>
          <TabsTrigger value="active">Active Tabs</TabsTrigger>
          <TabsTrigger value="closed">Closed Tabs</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tabs Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Loading tabs...</div>
      ) : tabs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <Beer className="h-12 w-12 mx-auto mb-4 text-slate-200" />
          <p className="font-bold text-slate-500">No {view === "active" ? "open" : "closed"} tabs</p>
          {view === "active" && (
            <Button variant="link" onClick={() => setOpenTabDialog(true)} className="mt-2">
              Open the first tab
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tabs.map(tab => {
            const total = parseFloat(tab.total_amount as string);
            const itemCount = tab.items?.length ?? 0;
            const isActive = tab.order_status === "ACTIVE" || tab.order_status === "PENDING";
            return (
              <Card
                key={tab.id}
                className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Beer className="h-4 w-4 text-amber-500" />
                        {tab.customer_name || "Guest"}
                      </CardTitle>
                      {tab.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{tab.notes}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${isActive ? "border-amber-300 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}
                    >
                      {isActive ? "OPEN" : "CLOSED"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Items preview */}
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {(tab.items ?? []).slice(0, 5).map((item: OrderItem, i: number) => (
                      <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>{item.name_snapshot}</span>
                        <span className="font-medium">×{item.quantity}</span>
                      </div>
                    ))}
                    {itemCount > 5 && (
                      <p className="text-[10px] text-slate-400">+{itemCount - 5} more items</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{formatINR(total)}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(tab.placed_at || tab.created_at)}
                      </p>
                    </div>
                    {isActive && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 px-2.5 gap-1"
                          onClick={() => setAddItemsTab(tab)}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs h-8 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setPayTab(tab)}
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-8 px-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => {
                            if (confirm(`Cancel tab for ${tab.customer_name}?`)) {
                              cancelMutation.mutate(tab.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <OpenTabDialog
        open={openTabDialog}
        onClose={() => setOpenTabDialog(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["bar-tabs"] })}
      />
      <AddItemsDialog
        open={Boolean(addItemsTab)}
        tab={addItemsTab}
        onClose={() => setAddItemsTab(null)}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["bar-tabs"] })}
      />
      <MarkPaidDialog
        order={payTab}
        open={Boolean(payTab)}
        onOpenChange={open => { if (!open) { setPayTab(null); queryClient.invalidateQueries({ queryKey: ["bar-tabs"] }); } }}
      />
    </div>
  );
}
