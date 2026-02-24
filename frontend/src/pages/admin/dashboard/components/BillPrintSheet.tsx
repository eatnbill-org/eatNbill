import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Order } from "@/types/order";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";

interface BillPrintSheetProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

export function BillPrintSheet({ order, onOpenChange }: BillPrintSheetProps) {
  const { restaurant } = useRestaurantStore();

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[100vw] max-w-[400px] sm:max-w-[450px] bg-zinc-50 overflow-y-auto [&::-webkit-scrollbar]:hidden p-0">
        <style>{`
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              visibility: hidden;
              background: white;
              margin: 0 !important;
              padding: 0 !important;
            }
            #printable-bill {
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              margin: 0 !important;
              padding: 8mm !important;
              box-sizing: border-box !important;
              display: block !important;
              background: white !important;
            }
            #printable-bill * {
              visibility: visible !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="p-6 border-b bg-white sticky top-0 z-10 no-print">
          <SheetHeader>
            <SheetTitle className="text-center">Receipt Preview</SheetTitle>
          </SheetHeader>
        </div>

        {/* --- PRINTABLE AREA --- */}
        <div id="print-mount-root" className="flex justify-center bg-zinc-50 py-10 print:py-0 print:bg-white lowercase-none">
          <div
            id="printable-bill"
            className="w-full max-w-[320px] bg-white shadow-xl print:shadow-none p-6 sm:p-8 font-sans text-slate-900 space-y-6 flex flex-col min-h-fit"
          >
            {/* Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black leading-none">
                {restaurant?.name || "RESTAURANT"}
              </h2>
              {restaurant?.tagline && (
                <p className="text-sm font-bold text-slate-600 italic tracking-tight">
                  {restaurant.tagline}
                </p>
              )}
              <div className="text-[11px] text-slate-500 font-medium max-w-[200px] mx-auto leading-relaxed">
                {restaurant?.address || "No Address Provided"}
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-y-1 text-xs font-bold border-b border-slate-200 pb-4">
              <span className="text-slate-400 uppercase tracking-widest text-[9px]">ID</span>
              <span className="text-right font-mono">#{order.order_number || order.id.slice(0, 8)}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Date</span>
              <span className="text-right">{new Date(order.placed_at || order.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Time</span>
              <span className="text-right">{new Date(order.placed_at || order.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Cust</span>
              <span className="text-right uppercase truncate">{order.customer_name || "Guest"}</span>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">
                <span className="flex-1">Item</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-20 text-right">Amt</span>
              </div>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex text-xs items-start">
                    <div className="flex-1 flex flex-col">
                      <span className="font-bold uppercase leading-tight">{item.name_snapshot}</span>
                      <span className="text-[10px] text-slate-400 font-medium">@ {formatINR(parseFloat(item.price_snapshot))}</span>
                    </div>
                    <span className="w-10 text-center font-bold">{item.quantity}</span>
                    <span className="w-20 text-right font-black">{formatINR(parseFloat(item.price_snapshot) * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-slate-900 pt-6 space-y-3 mt-auto">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500 uppercase tracking-wider">Subtotal</span>
                <span>{formatINR(parseFloat(order.total_amount))}</span>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <span className="text-lg font-black uppercase tracking-tighter text-black">Total</span>
                <span className="text-2xl font-black tracking-tighter text-black">{formatINR(parseFloat(order.total_amount))}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-dashed border-slate-300 space-y-4">
              <p className="text-sm font-bold italic tracking-tight">Thank you for visiting us!</p>
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-[0.4em]">Powered by</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Eat</span>
                  <span className="w-1 h-1 rounded-full bg-slate-900" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">N</span>
                  <span className="w-1 h-1 rounded-full bg-slate-900" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Bill</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ACTION BUTTON --- */}
        <div className="p-6 bg-white border-t no-print">
          <Button
            id="print-action-btn"
            className="w-full bg-slate-900 text-white hover:bg-black h-14 text-base font-bold rounded-xl shadow-lg shadow-slate-200 transition-all gap-3"
            onClick={handlePrint}
          >
            <Printer className="w-5 h-5" />
            Print Receipt
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}
