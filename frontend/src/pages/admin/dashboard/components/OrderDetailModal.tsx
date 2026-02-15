import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, User, Phone, Clock, 
  ChefHat, UtensilsCrossed, AlertCircle, 
  Receipt, Wallet, X, MapPin
} from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/demo";

interface OrderDetailModalProps {
  order: Order | null;
  onClose: () => void;
  onMarkPaid: (order: Order) => void;
}

// 1. Enhanced Status Badge with Icons & Colors
function StatusBadge({ status }: { status: OrderStatus }) {
  const styles = {
    new: "bg-blue-100 text-blue-700 border-blue-200",
    cooking: "bg-orange-100 text-orange-700 border-orange-200 animate-pulse",
    ready: "bg-green-100 text-green-700 border-green-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  const icons = {
    new: <Clock className="w-3 h-3 mr-1" />,
    cooking: <ChefHat className="w-3 h-3 mr-1" />,
    ready: <UtensilsCrossed className="w-3 h-3 mr-1" />,
    completed: <CheckCircle2 className="w-3 h-3 mr-1" />,
    cancelled: <AlertCircle className="w-3 h-3 mr-1" />,
  };

  return (
    <span className={`flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// 2. Source Badge (Zomato/Swiggy/Walk-in)
function SourceBadge({ source }: { source: string }) {
    if (source === 'zomato') return <Badge className="bg-red-600 hover:bg-red-700 border-none text-white">Zomato</Badge>;
    if (source === 'swiggy') return <Badge className="bg-orange-500 hover:bg-orange-600 border-none text-white">Swiggy</Badge>;
    return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300"><MapPin className="w-3 h-3 mr-1"/> Walk-in</Badge>;
}

export function OrderDetailModal({ order, onClose, onMarkPaid }: OrderDetailModalProps) {
  if (!order) return null;

  // Calculate time elapsed
  const timeElapsed = Math.floor((Date.now() - new Date(order.receivedAt).getTime()) / 60000);

  return (
    <Dialog open={Boolean(order)} onOpenChange={(o) => !o && onClose()}>
      {/* LAYOUT STRATEGY:
          - Max Width: xl (Wide enough for 2 columns)
          - Height: Auto (fits content) but max-h-screen to prevent overflow
          - Overflow: Hidden (Header/Footer fixed, content scrolls if needed)
      */}
      <DialogContent className="max-w-4xl p-0 gap-0 border-0 shadow-2xl bg-[#F8F9FA] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* --- HEADER (Fixed) --- */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gray-900 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                    #{order.id}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <DialogTitle className="text-lg font-bold text-gray-900">Order Details</DialogTitle>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {new Date(order.receivedAt).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        <span className="text-gray-300">•</span>
                        <span className="font-medium text-gray-600">{timeElapsed} mins ago</span>
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <SourceBadge source={order.source} />
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
                    <X className="w-5 h-5 text-gray-500" />
                </Button>
            </div>
        </div>

        {/* --- BODY (Scrollable Area) --- */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                
                {/* LEFT COL: Customer & Payment Info */}
                <div className="md:col-span-1 space-y-6">
                    
                    {/* Customer Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer</h4>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">{order.customerName || "Guest"}</p>
                                <p className="text-xs text-gray-500">Walk-in Customer</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <Phone className="w-4 h-4 text-gray-400 ml-1" />
                            <p className="text-sm font-medium text-gray-700 font-mono tracking-wide">{order.customerPhone}</p>
                        </div>
                    </div>

                    {/* Instructions Card */}
                    <div className="bg-yellow-50 rounded-2xl p-5 shadow-sm border border-yellow-100">
                        <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                            Kitchen Note
                        </h4>
                        <p className="text-sm text-gray-800 italic leading-relaxed">
                            "{order.specialInstructions || "No special instructions for this order."}"
                        </p>
                    </div>

                    {/* Payment Summary Card */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium">{formatINR(order.total)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Tax (0%)</span>
                                <span className="font-medium">₹0</span>
                            </div>
                            <div className="h-px bg-dashed border-t border-gray-200 my-2"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-base font-bold text-gray-900">Total</span>
                                <span className="text-xl font-bold text-primary">{formatINR(order.total)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COL: Items List */}
                <div className="md:col-span-2 flex flex-col h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-3 border-b bg-gray-50/50 flex justify-between items-center">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Items</h4>
                            <Badge variant="secondary" className="text-xs font-mono">{order.items.length} Items</Badge>
                        </div>
                        
                        {/* Items List - Scrollable within card if too long */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                    <div className="flex items-center gap-4">
                                        {/* Quantity Badge */}
                                        <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-sm border group-hover:bg-white group-hover:shadow-sm transition-all">
                                            {item.qty}x
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-400">{formatINR(item.price)} / unit</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-gray-900 text-sm">{formatINR(item.qty * item.price)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>

        {/* --- FOOTER (Fixed Actions) --- */}
        <div className="bg-white border-t px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
                {order.isCredit && (
                    <Badge variant="warning" className="px-3 py-1 text-xs">
                        ⚠️ Marked as Udhaar
                    </Badge>
                )}
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="h-12 px-6 rounded-xl border-2 font-semibold text-gray-600 hover:bg-gray-50">
                    Close
                </Button>
                <Button 
                    onClick={() => onMarkPaid(order)}
                    disabled={Boolean(order.paidAt)}
                    className={`h-12 px-8 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                        order.paidAt 
                        ? "bg-green-100 text-green-700 hover:bg-green-100 cursor-default" 
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                >
                    {order.paidAt ? (
                        <> <CheckCircle2 className="w-5 h-5" /> Paid Successfully </>
                    ) : (
                        <> <Wallet className="w-5 h-5" /> Mark as Paid </>
                    )}
                </Button>
            </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}