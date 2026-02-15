import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useDemoStore } from "@/store/demo-store";
import { formatINR } from "@/lib/format";
import type { Order, PaymentMethod } from "@/types/demo";

interface PaymentModalProps {
  order: Order | null;
  onClose: () => void;
}

export function PaymentModal({ order, onClose }: PaymentModalProps) {
  const { state, dispatch } = useDemoStore();
  const [method, setMethod] = React.useState<PaymentMethod>("cash");
  const [isCredit, setIsCredit] = React.useState(false);
  const [creditAmount, setCreditAmount] = React.useState(0);

  // Reset state when order opens
  React.useEffect(() => {
    if (order) {
      setMethod(state.ui.lastPaymentMethod || "cash");
      setIsCredit(Boolean(order.isCredit));
      setCreditAmount(order.creditAmount || order.total);
    }
  }, [order, state.ui.lastPaymentMethod]);

  const handleConfirm = () => {
    if (!order) return;
    
    dispatch({
      type: "SET_PAYMENT",
      orderId: order.id,
      at: new Date().toISOString(),
      method,
      isCredit,
      creditAmount: isCredit ? creditAmount : 0,
    });
    
    onClose();
  };

  if (!order) return null;

  return (
    <Dialog open={Boolean(order)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>Settle Payment</DialogTitle>
          <DialogDescription>Confirm payment method or mark as credit.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Amount Display */}
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payable</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatINR(order.total)}</p>
          </div>

          <div className="space-y-4">
            {/* Method Select */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online / UPI</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Udhaar Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
              <div className="space-y-0.5">
                <Label className="text-base">Udhaar (Credit)</Label>
                <p className="text-xs text-muted-foreground">Mark as unpaid/pending</p>
              </div>
              <Switch checked={isCredit} onCheckedChange={setIsCredit} />
            </div>

            {/* Credit Amount Input (Only if Credit is ON) */}
            {isCredit && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button 
            variant={isCredit ? "warning" : "success"} 
            onClick={handleConfirm}
            className="flex-1"
          >
            {isCredit ? "Confirm Credit" : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}