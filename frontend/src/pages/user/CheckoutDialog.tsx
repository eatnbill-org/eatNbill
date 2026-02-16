import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useDemoStore } from "@/store/demo-store";
import type { OrderItem } from "@/types/demo";
import { formatINR } from "@/lib/format";
import { User, Phone, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// LocalStorage key and expiry (6 months in ms)
const CUSTOMER_STORAGE_KEY = "resto-bilo:customer-info";
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

type StoredCustomer = {
  name: string;
  phone: string;
  savedAt: number;
};

function getStoredCustomer(): StoredCustomer | null {
  try {
    const data = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!data) return null;
    const parsed: StoredCustomer = JSON.parse(data);
    if (Date.now() - parsed.savedAt > SIX_MONTHS_MS) {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveCustomerInfo(name: string, phone: string) {
  const data: StoredCustomer = { name, phone, savedAt: Date.now() };
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Print a kitchen order slip via hidden iframe
 */
function printKitchenSlip(payload: {
  tableName: string;
  items: OrderItem[];
  customerName: string;
  notes?: string;
}) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const itemsHtml = payload.items.map(item =>
    `<tr><td style="padding:4px 0;font-size:14px;">${item.qty}x ${item.name}</td></tr>`
  ).join('');

  const slipHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kitchen Order</title>
      <style>
        @page { margin: 5mm; size: 80mm auto; }
        body { font-family: 'Courier New', monospace; margin: 0; padding: 8px; font-size: 14px; width: 76mm; }
        .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
        .header h1 { font-size: 18px; margin: 0; letter-spacing: 2px; }
        .info { margin-bottom: 8px; }
        .info p { margin: 2px 0; font-size: 13px; }
        .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; }
        .items table { width: 100%; }
        .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #666; }
        .notes { background: #f5f5f5; padding: 6px; margin-top: 6px; font-size: 12px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>KITCHEN ORDER</h1>
      </div>
      <div class="info">
        <p><strong>Table:</strong> ${payload.tableName}</p>
        <p><strong>Time:</strong> ${timeStr}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
        ${payload.customerName ? `<p><strong>Customer:</strong> ${payload.customerName}</p>` : ''}
      </div>
      <div class="items">
        <table>${itemsHtml}</table>
      </div>
      ${payload.notes ? `<div class="notes"><strong>Notes:</strong> ${payload.notes}</div>` : ''}
      <div class="footer">
        <p>--- Kitchen Copy ---</p>
      </div>
    </body>
    </html>
  `;

  // Create hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '80mm';
  iframe.style.height = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(slipHtml);
    iframeDoc.close();

    // Wait for content to load, then print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up iframe after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }, 300);
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrderItem[];
  tableId?: string | null;
  tables?: any[]; // Available tables list for waiter mode
  isWaiterMode?: boolean; // Waiter mode doesn't auto-fill from storage
  reorderContext?: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    currentTotal: number;
  };
  onSubmit: (payload: {
    customerName: string;
    customerPhone: string;
    specialInstructions: string;
    consentWhatsapp: boolean;
  }) => void;
  onTableChange?: (tableId: string) => void; // Callback when table is changed
};

export default function CheckoutDialog({ open, onOpenChange, items, tableId, tables = [], isWaiterMode = false, reorderContext, onSubmit, onTableChange }: Props) {
  const { state } = useDemoStore();
  const [name, setName] = React.useState(reorderContext?.customerName || "");
  const [phone, setPhone] = React.useState(reorderContext?.customerPhone || "");
  const [instructions, setInstructions] = React.useState("");
  const [consent, setConsent] = React.useState(true);
  const [selectedTableLocal, setSelectedTableLocal] = React.useState(tableId || "TAKEAWAY");

  // Sync table from prop
  React.useEffect(() => {
    if (tableId) setSelectedTableLocal(tableId);
  }, [tableId]);

  // Load from localStorage on mount (only for customer mode)
  React.useEffect(() => {
    if (reorderContext) {
      setName(reorderContext.customerName);
      setPhone(reorderContext.customerPhone);
      return;
    }
    if (isWaiterMode) return;
    const stored = getStoredCustomer();
    if (stored) {
      setName(stored.name);
      setPhone(stored.phone);
    }
  }, [isWaiterMode, reorderContext]);

  const normalizedPhone = phone.replace(/\s+/g, "").trim();
  const repeatCustomer = state.customers.find((c) => c.phone.replace(/\s+/g, "") === normalizedPhone);

  const total = items.reduce((s, i) => s + i.qty * i.price, 0);

  const canSubmit = name.trim().length >= 2 && normalizedPhone.length >= 10 && items.length > 0;

  const handleTableChange = (value: string) => {
    setSelectedTableLocal(value);
    onTableChange?.(value);
  };

  const handleSubmit = () => {
    // Save customer info for 6 months (only for customer mode)
    if (!isWaiterMode) {
      saveCustomerInfo(name.trim(), normalizedPhone);
    }

    // Print kitchen slip (only for staff mode, non-reorder)
    if (isWaiterMode && !reorderContext) {
      const tableName = selectedTableLocal === 'TAKEAWAY'
        ? 'Takeaway'
        : (tables.find(t => t.id === selectedTableLocal)?.table_number || selectedTableLocal);

      printKitchenSlip({
        tableName,
        items,
        customerName: name.trim(),
        notes: instructions.trim() || undefined,
      });
    }

    onSubmit({
      customerName: name.trim(),
      customerPhone: normalizedPhone,
      specialInstructions: instructions.trim(),
      consentWhatsapp: consent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete your order</DialogTitle>
          <DialogDescription>
            {repeatCustomer ? `Welcome back, ${repeatCustomer.name}!` : "Thanks for trying us."}{" "}
            {selectedTableLocal && selectedTableLocal !== 'TAKEAWAY' && (
              <span className="text-orange-500 font-medium">
                • Table: {tables.find(t => t.id === selectedTableLocal)?.table_number || selectedTableLocal}
              </span>
            )}
            {selectedTableLocal === 'TAKEAWAY' && (
              <span className="text-blue-500 font-medium">• Takeaway</span>
            )}
          </DialogDescription>
        </DialogHeader>
        {/* just */}
        <div className={reorderContext ? "block" : "grid gap-5 md:grid-cols-2"}>
          {!reorderContext && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  Full Name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Phone Number
                </label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91-XXXXXXXXXX" inputMode="tel" />
              </div>

              {/* Table Selection (only for staff/waiter mode) */}
              {isWaiterMode && tables.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    Select Table
                  </label>
                  <Select value={selectedTableLocal} onValueChange={handleTableChange}>
                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white focus:ring-primary/20 shadow-sm font-semibold">
                      <SelectValue placeholder="Choose a table..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="TAKEAWAY" className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>🛍️</span>
                          <span>Takeaway</span>
                        </div>
                      </SelectItem>
                      {tables.filter((t: any) => t.is_active !== false).map((table: any) => (
                        <SelectItem key={table.id} value={table.id} className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>🪑</span>
                            <span>Table {table.table_number} {table.hall?.name ? `(${table.hall.name})` : ''}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Special Instructions (optional)</label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Any dietary restrictions or special requests?"
                  className="min-h-[80px] md:min-h-[110px]"
                />
              </div>
              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(Boolean(v))} id="whatsapp-consent" />
                <label htmlFor="whatsapp-consent" className="text-sm">
                  I consent to receive WhatsApp updates about my order
                </label>
              </div>
            </div>
          )}

          <div className={`rounded-xl border bg-card p-4 shadow-sm ${reorderContext ? 'w-full' : ''}`}>
            <p className="text-sm font-medium">
              {reorderContext ? `Adding to Order #${reorderContext.orderNumber}` : "Order summary"}
            </p>
            <Separator className="my-3" />
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-4 text-sm">
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

            <div className="space-y-1.5">
              {reorderContext && (
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">Current Total</p>
                  <p className="font-medium">{formatINR(reorderContext.currentTotal)}</p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">{reorderContext ? "New Items Total" : "Subtotal"}</p>
                <p className={`font-semibold ${reorderContext ? "text-blue-600" : ""}`}>{formatINR(total)}</p>
              </div>

              {reorderContext && <Separator className="my-2" />}

              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{reorderContext ? "Updated Total" : "To Pay"}</p>
                <p className="text-xl font-black tracking-tight text-orange-500">
                  {reorderContext ? formatINR(Number(reorderContext.currentTotal) + total) : formatINR(total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            className={`w-full sm:w-auto ${reorderContext ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"}`}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {reorderContext ? "Add Items to Order" : "Place order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
