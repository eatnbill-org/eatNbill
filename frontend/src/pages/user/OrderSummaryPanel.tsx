import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OrderItem } from "@/types/demo";
import { formatINR } from "@/lib/format";
import { X } from "lucide-react";

type Props = {
  items: OrderItem[];
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
};

export default function OrderSummaryPanel({ items, onInc, onDec, onRemove, onCheckout }: Props) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const totalItems = items.reduce((s, i) => s + i.qty, 0);

  const checkoutDisabled = items.length === 0;

  return (
    <Card className="sticky top-20 rounded-2xl border bg-muted/40 p-4 shadow-elev-1">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Your order</p>
        <p className="text-xs text-muted-foreground">{totalItems} items</p>
      </div>
      <Separator className="my-3" />

      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium">Nothing added yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Tap “Add to order” to build your meal.</p>
        </div>
      ) : (
        <div className="max-h-[48vh] space-y-3 overflow-auto pr-1">
          {items.map((it) => (
            <div key={it.id} className="rounded-xl border bg-card p-3 shadow-elev-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatINR(it.price)} × {it.qty}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onRemove(it.id)} aria-label="Remove">
                  <X />
                </Button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-md border bg-background">
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onDec(it.id)} aria-label="Decrease">
                    −
                  </Button>
                  <span className="w-10 text-center text-sm font-medium">{it.qty}</span>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onInc(it.id)} aria-label="Increase">
                    +
                  </Button>
                </div>
                <p className="text-sm font-semibold">{formatINR(it.qty * it.price)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator className="my-3" />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatINR(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Grand total</span>
          <span className="text-lg font-semibold tracking-tight">{formatINR(subtotal)}</span>
        </div>
      </div>

      <Button className="mt-4 w-full" variant="brand" disabled={checkoutDisabled} onClick={onCheckout}>
        Proceed to checkout
      </Button>
    </Card>
  );
}
