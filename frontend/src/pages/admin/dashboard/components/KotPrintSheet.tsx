import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import type { Order } from "@/types/order";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";

interface KotPrintSheetProps {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}

export function KotPrintSheet({ order, onOpenChange }: KotPrintSheetProps) {
  const { restaurant } = useRestaurantStore();

  const handlePrint = () => {
    window.print();
  };

  if (!order) return null;

  const activeItems = order.items.filter(
    (item) => !['VOIDED', 'COMPED', 'CANCELLED'].includes((item as any).status ?? '')
  );

  const kotTime = format(new Date(), 'dd/MM/yyyy HH:mm');
  const orderTime = format(new Date(order.placed_at || order.created_at), 'HH:mm');

  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[100vw] max-w-[360px] sm:max-w-[400px] bg-zinc-50 overflow-y-auto [&::-webkit-scrollbar]:hidden p-0">
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
            #printable-kot {
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              margin: 0 !important;
              padding: 6mm !important;
              box-sizing: border-box !important;
              display: block !important;
              background: white !important;
            }
            #printable-kot * {
              visibility: visible !important;
            }
            .kot-screen-only {
              display: none !important;
            }
          }
        `}</style>

        {/* Screen-only header */}
        <SheetHeader className="kot-screen-only px-5 py-4 border-b border-slate-100">
          <SheetTitle className="text-base font-black uppercase tracking-tight text-slate-800">
            Kitchen Order Ticket
          </SheetTitle>
          <p className="text-xs text-slate-500 mt-1">
            Order #{order.order_number} — Table {order.table_number || 'N/A'}
          </p>
        </SheetHeader>

        {/* Preview */}
        <div className="p-4 flex justify-center">
          <div
            id="printable-kot"
            style={{ fontFamily: "'Courier New', Courier, monospace", width: "100%", maxWidth: "300px" }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", borderBottom: "2px dashed #000", paddingBottom: "6px", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                {restaurant?.name || 'RESTAURANT'}
              </div>
              <div style={{ fontSize: "11px", marginTop: "2px", textTransform: "uppercase", letterSpacing: "2px", fontWeight: "bold" }}>
                *** KITCHEN ORDER TICKET ***
              </div>
            </div>

            {/* Order Info */}
            <div style={{ fontSize: "11px", marginBottom: "6px", lineHeight: "1.6" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "bold" }}>KOT#:</span>
                <span style={{ fontWeight: "bold" }}>{order.order_number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "bold" }}>TABLE:</span>
                <span style={{ fontWeight: "bold" }}>{order.table_number || 'TAKEAWAY'}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Order Time:</span>
                <span>{orderTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Print Time:</span>
                <span>{kotTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Type:</span>
                <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{order.order_type}</span>
              </div>
              {order.customer_name && order.customer_name !== 'Anonymous' && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Guest:</span>
                  <span>{order.customer_name}</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px dashed #000", marginBottom: "8px" }} />

            {/* Items */}
            <div style={{ fontSize: "12px" }}>
              {activeItems.map((item) => (
                <div key={item.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontWeight: "bold", flex: 1, textTransform: "uppercase", lineHeight: "1.3" }}>
                      {item.name_snapshot}
                    </span>
                    <span style={{ fontWeight: "bold", fontSize: "14px", marginLeft: "8px", flexShrink: 0 }}>
                      x{item.quantity}
                    </span>
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: "10px", fontStyle: "italic", marginTop: "2px", paddingLeft: "4px", borderLeft: "2px solid #000" }}>
                      NOTE: {item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ borderTop: "2px dashed #000", marginTop: "8px", paddingTop: "6px", fontSize: "10px", textAlign: "center" }}>
              <div>Total Items: {activeItems.reduce((sum, i) => sum + i.quantity, 0)}</div>
              {order.notes && (
                <div style={{ marginTop: "4px", fontStyle: "italic", fontSize: "10px" }}>
                  ORDER NOTE: {order.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Screen-only action buttons */}
        <div className="kot-screen-only px-4 pb-4 flex gap-2">
          <Button
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
            onClick={handlePrint}
          >
            <Printer className="w-4 h-4" />
            Print KOT
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
