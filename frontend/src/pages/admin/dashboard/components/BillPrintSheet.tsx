import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Order } from "@/types/order";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import i18n from "@/i18n";
import { QRCodeSVG } from "qrcode.react";

type ReceiptTemplate = "MM80_STANDARD" | "MM58_COMPACT" | "A4_TAX_INVOICE";

function getReceiptTemplate(): ReceiptTemplate {
  try {
    const value = localStorage.getItem("billing_receipt_template");
    if (value === "MM58_COMPACT" || value === "A4_TAX_INVOICE" || value === "MM80_STANDARD") {
      return value;
    }
  } catch {
    // ignore local storage errors
  }
  return "MM80_STANDARD";
}

function billLabel(key: string) {
  const language = i18n.resolvedLanguage || "en";
  const enLabel = i18n.getFixedT("en", "billing")(`print.${key}`) as string;
  if (language === "en") return enLabel;
  const localLabel = i18n.getFixedT(language, "billing")(`print.${key}`) as string;
  return `${localLabel} / ${enLabel}`;
}

interface BillPrintSheetProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

export function BillPrintSheet({ order, onOpenChange }: BillPrintSheetProps) {
  const { restaurant } = useRestaurantStore();
  const receiptUrl = restaurant?.slug && order
    ? `${window.location.origin}/${restaurant.slug}/orders/${order.id}/receipt`
    : null;
  const receiptTemplate = getReceiptTemplate();
  const pageSize = receiptTemplate === "MM58_COMPACT" ? "58mm auto" : receiptTemplate === "MM80_STANDARD" ? "80mm auto" : "A4";
  const pageWidth = receiptTemplate === "MM58_COMPACT" ? "58mm" : receiptTemplate === "MM80_STANDARD" ? "80mm" : "210mm";
  const printableWidth = receiptTemplate === "MM58_COMPACT" ? "54mm" : receiptTemplate === "MM80_STANDARD" ? "80mm" : "210mm";
  const previewWidthClass = receiptTemplate === "MM58_COMPACT" ? "max-w-[240px]" : receiptTemplate === "MM80_STANDARD" ? "max-w-[320px]" : "max-w-[720px]";

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
              size: ${pageSize};
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
              width: ${pageWidth} !important;
              margin: 0 !important;
              padding: ${receiptTemplate === "A4_TAX_INVOICE" ? "10mm" : "8mm"} !important;
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
            className={`w-full ${previewWidthClass} bg-white shadow-xl print:shadow-none p-6 sm:p-8 font-sans text-slate-900 space-y-6 flex flex-col min-h-fit`}
            style={{ width: printableWidth }}
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
              {restaurant?.fssai_license && (
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  FSSAI: {restaurant.fssai_license}
                </div>
              )}
              {restaurant?.gst_number && (
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  GSTIN: {restaurant.gst_number}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-y-1 text-xs font-bold border-b border-slate-200 pb-4">
              <span className="text-slate-400 uppercase tracking-widest text-[9px]">{billLabel("order")}</span>
              <span className="text-right font-mono">#{order.order_number || order.id.slice(0, 8)}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Date</span>
              <span className="text-right">{new Date(order.placed_at || order.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Time</span>
              <span className="text-right">{new Date(order.placed_at || order.created_at).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>

              <span className="text-slate-400 uppercase tracking-widest text-[9px]">{billLabel("customer")}</span>
              <span className="text-right uppercase truncate">{order.customer_name || "Guest"}</span>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">
                <span className="flex-1">{billLabel("item")}</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-20 text-right">{billLabel("amount")}</span>
              </div>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex text-xs items-start">
                    <div className="flex-1 flex flex-col">
                      <span className="font-bold uppercase leading-tight">{item.name_snapshot}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="text-[9px] text-slate-500 font-medium leading-tight">
                          {item.modifiers.map(m => m.name_snapshot).join(', ')}
                        </span>
                      )}
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
              {(() => {
                const subtotal = parseFloat(order.total_amount);
                const discount = order.discount_amount ? parseFloat(order.discount_amount as string) : 0;
                const tip = order.tip_amount ? parseFloat(order.tip_amount as string) : 0;
                const afterDiscount = subtotal - discount;
                const total = afterDiscount + tip;
                return (
                  <>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-500 uppercase tracking-wider">{billLabel("subtotal")}</span>
                      <span>{formatINR(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-emerald-700">
                        <span className="uppercase tracking-wider">Discount</span>
                        <span>- {formatINR(discount)}</span>
                      </div>
                    )}
                    {tip > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-500 uppercase tracking-wider">Tip</span>
                        <span>{formatINR(tip)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                      <span className="text-lg font-black uppercase tracking-tighter text-black">{billLabel("totalPayable")}</span>
                      <span className="text-2xl font-black tracking-tighter text-black">{formatINR(total)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-dashed border-slate-300 space-y-4">
              <p className="text-sm font-bold italic tracking-tight">{billLabel("thankYou")}</p>
              {receiptUrl && (
                <div className="flex flex-col items-center gap-1.5">
                  <QRCodeSVG value={receiptUrl} size={72} level="M" />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Scan for digital receipt</p>
                </div>
              )}
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
