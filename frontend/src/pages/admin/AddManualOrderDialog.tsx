import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDemoStore, makeOrderId } from "@/store/demo-store";
import type { OrderItem, OrderSource, Product } from "@/types/demo";
import { clamp, formatINR } from "@/lib/format";
import { Search, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function toOrderItem(p: Product, qty: number): OrderItem {
  const discount = p.discount_percent || 0;
  const discountedPrice = p.price * (1 - discount / 100);
  return { id: p.id, name: p.name, price: discountedPrice, qty, discount_applied: discount };
}

export default function AddManualOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, dispatch } = useDemoStore();

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [specialInstructions, setSpecialInstructions] = React.useState("");
  const [arriveAt, setArriveAt] = React.useState(""); // New State for Arrive Time
  const [source, setSource] = React.useState<OrderSource>("new");
  const [cart, setCart] = React.useState<Record<number, number>>({});

  // Search State
  const [itemQuery, setItemQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setCustomerPhone("");
    setSpecialInstructions("");
    setArriveAt("");
    setSource("new");
    setCart({});
    setItemQuery("");
  }, [open]);

  const items = React.useMemo(() => {
    const products = new Map(state.products.map((p) => [p.id, p]));
    return Object.entries(cart)
      .map(([idStr, qty]) => {
        const p = products.get(Number(idStr));
        if (!p) return null;
        return toOrderItem(p, qty);
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, state.products]);

  // Filter Products based on Search
  const filteredProducts = React.useMemo(() => {
    const q = itemQuery.toLowerCase().trim();
    if (!q) return state.products;
    return state.products.filter(p => p.name.toLowerCase().includes(q));
  }, [state.products, itemQuery]);

  const total = React.useMemo(() => items.reduce((s, it) => s + it.qty * it.price, 0), [items]);

  const inc = (productId: number) => setCart((c) => ({ ...c, [productId]: clamp((c[productId] ?? 0) + 1, 0, 99) }));
  const dec = (productId: number) =>
    setCart((c) => {
      const next = { ...c };
      const v = (next[productId] ?? 0) - 1;
      if (v <= 0) delete next[productId];
      else next[productId] = v;
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Increased Width: max-w-4xl */}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Order (Manual)</DialogTitle>
          <DialogDescription>Create an order for walk-in/phone customers.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">

          {/* Left Column: Customer Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91-XXXXXXXXXX" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source} onValueChange={(v) => setSource(v as OrderSource)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="new">Walk-In / Phone</SelectItem>
                    <SelectItem value="zomato">Zomato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Arrive At Input */}
              <div className="space-y-2">
                <Label>Arrive At (Optional)</Label>
                <Input
                  type="time"
                  value={arriveAt}
                  onChange={(e) => setArriveAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Spicy? Less oil? Allergies?"
                className="min-h-[120px]"
              />
            </div>

            {/* Total Display on Left side too */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">Total Payable</span>
                <span className="text-2xl font-bold text-primary">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Selection */}
          <div className="flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden h-[500px]">
            <div className="p-4 border-b bg-muted/20">
              <p className="text-sm font-semibold mb-3">Select Items</p>
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-background"
                  placeholder="Search items..."
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scrollable List with Hidden Scrollbar */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 [&::-webkit-scrollbar]:hidden">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No items found.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const qty = cart[p.id] ?? 0;
                  return (
                    <div key={p.id} className={cn(
                      "flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors",
                      p.outOfStock ? "opacity-60 grayscale-[0.5] cursor-not-allowed border-dashed" : "hover:bg-accent/50"
                    )}>

                      {/* Product Image */}
                      <div className="h-12 w-12 rounded-md border bg-muted overflow-hidden shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Name & Price */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-bold text-foreground">{p.name}</p>
                          {p.outOfStock && (
                            <span className="text-[8px] font-black uppercase bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full border border-rose-200">Out of Stock</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(p.discount_percent || 0) > 0 ? (
                            <>
                              <p className="text-sm font-bold text-green-600">{formatINR(p.price * (1 - p.discount_percent! / 100))}</p>
                              <p className="text-xs text-muted-foreground line-through">{formatINR(p.price)}</p>
                              <Badge className="h-4 text-[8px] bg-green-100 text-green-700">
                                {p.discount_percent}% OFF
                              </Badge>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-muted-foreground">{formatINR(p.price)}</p>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-3 bg-muted/30 rounded-md p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={p.outOfStock}
                          className="h-8 w-8 rounded-sm hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => dec(p.id)}
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm font-bold">{qty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={p.outOfStock}
                          className="h-8 w-8 rounded-sm hover:bg-primary/10 hover:text-primary"
                          onClick={() => inc(p.id)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            className="px-8"
            onClick={() => {
              const name = customerName.trim() || "Guest";
              const phone = customerPhone.trim() || "N/A";
              if (items.length === 0) return;

              const now = new Date().toISOString();
              const id = makeOrderId();
              dispatch({
                type: "PLACE_ORDER",
                payload: {
                  id,
                  source,
                  status: "new",
                  items,
                  customerName: name,
                  customerPhone: phone,
                  specialInstructions: specialInstructions.trim() || undefined,
                  consentWhatsapp: false,
                  receivedAt: now,
                  cookingStartedAt: null,
                  readyAt: null,
                  paidAt: null,
                  paymentMethod: null,
                  isCredit: false,
                  creditAmount: 0,
                  // @ts-ignore: Assuming arrivingAt is handled in store even if type isn't updated yet
                  arrivingAt: arriveAt || undefined,
                },
              });

              onOpenChange(false);
            }}
            disabled={items.length === 0}
          >
            Confirm Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
