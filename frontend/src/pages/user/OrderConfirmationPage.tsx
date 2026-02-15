import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useDemoStore } from "@/store/demo-store";
import { formatDateTime, formatINR } from "@/lib/format";
import { CheckCircle2, Copy } from "lucide-react";

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const { state } = useDemoStore();

  const order = useMemo(() => state.orders.find((o) => o.id === orderId), [orderId, state.orders]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-16">
          <Card className="mx-auto max-w-lg rounded-2xl">
            <CardHeader>
              <CardTitle>Order not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">This order ID isn’t in local demo data.</p>
              <Link to="/">
                <Button>Back to menu</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const total = order.total;

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-10">
        <Card className="mx-auto max-w-2xl overflow-hidden rounded-2xl border shadow-elev-1">
          <div className="bg-brand-gradient p-6 text-primary-foreground">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-medium tracking-widest text-primary-foreground/80">ARABIAN NIGHTS</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your order is confirmed</h1>
                <p className="mt-2 text-sm text-primary-foreground/80">We’ve received your order. Updates will be shared when ready.</p>
              </div>
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>

          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Order ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="truncate text-lg font-semibold tracking-tight">{order.id}</p>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(order.id)}
                    aria-label="Copy order ID"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
              <Badge variant="subtle">Placed {formatDateTime(order.receivedAt)}</Badge>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Customer</p>
                <p className="mt-2 text-sm">{order.customerName}</p>
                <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                {order.specialInstructions ? (
                  <p className="mt-3 text-sm text-muted-foreground">“{order.specialInstructions}”</p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No special instructions.</p>
                )}
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-elev-1">
                <p className="text-sm font-semibold">Order details</p>
                <div className="mt-3 space-y-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{it.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {it.qty} × {formatINR(it.price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatINR(it.qty * it.price)}</p>
                    </div>
                  ))}
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total amount</p>
                  <p className="text-lg font-semibold tracking-tight">{formatINR(total)}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/">
                <Button variant="secondary">Back to menu</Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  const shareText = `Arabian Nights Order ID: ${order.id}`;
                  if (navigator.share) navigator.share({ text: shareText });
                  else navigator.clipboard?.writeText(shareText);
                }}
              >
                Share order ID
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
