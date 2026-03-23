import * as React from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { formatINR } from "@/lib/format";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ReceiptOrder {
  id: string;
  order_number: string | null;
  status: string;
  payment_status: string;
  total_amount: string;
  discount_amount: string | null;
  tip_amount: string | null;
  customer_name: string | null;
  order_type: string;
  placed_at: string | null;
  created_at: string;
  items: {
    id: string;
    name_snapshot: string;
    price_snapshot: string;
    quantity: number;
    modifiers: { name_snapshot: string }[];
  }[];
}

interface ReceiptRestaurant {
  name: string;
  tagline: string | null;
  address: string | null;
  gst_number: string | null;
  fssai_license: string | null;
}

export default function ReceiptPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>();
  const [order, setOrder] = React.useState<ReceiptOrder | null>(null);
  const [restaurant, setRestaurant] = React.useState<ReceiptRestaurant | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug || !orderId) return;
    setLoading(true);
    apiClient
      .get<{ data: { order: ReceiptOrder; restaurant: ReceiptRestaurant } }>(
        `/public/${slug}/orders/${orderId}/receipt`
      )
      .then((res) => {
        const d = (res.data as any)?.data;
        setOrder(d?.order ?? null);
        setRestaurant(d?.restaurant ?? null);
      })
      .catch(() => setError("Receipt not found"))
      .finally(() => setLoading(false));
  }, [slug, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading receipt...</div>
      </div>
    );
  }

  if (error || !order || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Receipt not found</p>
          <p className="text-sm text-slate-400 mt-1">{error || "This receipt link may have expired"}</p>
        </div>
      </div>
    );
  }

  const subtotal = parseFloat(order.total_amount);
  const discount = order.discount_amount ? parseFloat(order.discount_amount) : 0;
  const tip = order.tip_amount ? parseFloat(order.tip_amount) : 0;
  const total = subtotal - discount + tip;
  const placedAt = order.placed_at || order.created_at;

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex items-start justify-center">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Status banner */}
        <div className={`px-6 py-4 text-center ${order.payment_status === "PAID" ? "bg-emerald-500" : "bg-amber-400"}`}>
          <div className="flex items-center justify-center gap-2">
            {order.payment_status === "PAID" ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <Clock className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-black text-sm uppercase tracking-widest">
              {order.payment_status === "PAID" ? "Payment Complete" : "Payment Pending"}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Restaurant header */}
          <div className="text-center space-y-1 border-b-2 border-slate-900 pb-5">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-black">{restaurant.name}</h1>
            {restaurant.tagline && <p className="text-sm italic text-slate-500">{restaurant.tagline}</p>}
            {restaurant.address && <p className="text-xs text-slate-400">{restaurant.address}</p>}
            {restaurant.fssai_license && <p className="text-[10px] text-slate-400 font-bold uppercase">FSSAI: {restaurant.fssai_license}</p>}
            {restaurant.gst_number && <p className="text-[10px] text-slate-400 font-bold uppercase">GSTIN: {restaurant.gst_number}</p>}
          </div>

          {/* Order info */}
          <div className="grid grid-cols-2 gap-y-2 text-xs">
            <span className="text-slate-400 uppercase tracking-wider font-bold">Order</span>
            <span className="text-right font-mono font-bold">#{order.order_number || order.id.slice(0, 8)}</span>
            <span className="text-slate-400 uppercase tracking-wider font-bold">Date</span>
            <span className="text-right">{format(parseISO(placedAt), "dd MMM yyyy")}</span>
            <span className="text-slate-400 uppercase tracking-wider font-bold">Time</span>
            <span className="text-right">{format(parseISO(placedAt), "hh:mm a")}</span>
            {order.customer_name && (
              <>
                <span className="text-slate-400 uppercase tracking-wider font-bold">Customer</span>
                <span className="text-right font-semibold">{order.customer_name}</span>
              </>
            )}
          </div>

          {/* Items */}
          <div className="space-y-3 border-t pt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <div className="flex-1">
                  <div className="font-bold uppercase">{item.name_snapshot}</div>
                  {item.modifiers.length > 0 && (
                    <div className="text-xs text-slate-500">{item.modifiers.map((m) => m.name_snapshot).join(", ")}</div>
                  )}
                  <div className="text-xs text-slate-400">@ {formatINR(parseFloat(item.price_snapshot))}</div>
                </div>
                <span className="w-8 text-center font-bold text-slate-600">{item.quantity}</span>
                <span className="w-20 text-right font-black">{formatINR(parseFloat(item.price_snapshot) * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-slate-900 pt-4 space-y-2">
            <div className="flex justify-between text-sm font-bold text-slate-500">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>Discount</span>
                <span>- {formatINR(discount)}</span>
              </div>
            )}
            {tip > 0 && (
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Tip</span>
                <span>{formatINR(tip)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-slate-200 pt-2">
              <span className="font-black uppercase tracking-tight text-lg">Total</span>
              <span className="text-2xl font-black text-black">{formatINR(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-dashed border-slate-200 space-y-1">
            <p className="text-sm font-bold italic text-slate-600">Thank you for your visit!</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Powered by Eat · N · Bill</p>
          </div>
        </div>
      </div>
    </div>
  );
}
