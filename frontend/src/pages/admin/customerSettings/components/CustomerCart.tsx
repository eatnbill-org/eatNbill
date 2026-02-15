import * as React from "react";
import { useDemoStore, makeOrderId } from "@/store/demo-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatINR } from "@/lib/format";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function CustomerCart() {
  const { state, dispatch } = useDemoStore();
  const settings = state.customerSettings;
  
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [note, setNote] = React.useState("");

  const cartItems = React.useMemo(() => {
    return state.cart.map(item => {
      const product = state.products.find(p => p.id === item.productId);
      return { ...item, product };
    }).filter(i => i.product);
  }, [state.cart, state.products]);

  const total = cartItems.reduce((acc, item) => acc + (item.product!.price * item.qty), 0);

  const handlePlaceOrder = () => {
    if (settings.requireCustomerDetails) {
      if (!name.trim()) return toast.error("Please enter your name");
      if (!phone.trim()) return toast.error("Please enter your phone number");
    }

    if (cartItems.length === 0) return toast.error("Cart is empty");

    const orderPayload = {
      id: makeOrderId(),
      customerName: name || "Guest",
      customerPhone: phone || "Walk-in",
      items: cartItems.map(i => ({
        id: i.productId,
        name: i.product!.name,
        price: i.product!.price,
        qty: i.qty
      })),
      specialInstructions: note,
      receivedAt: new Date().toISOString(),
      status: "new" as const,
      source: "walkin",
      paymentMethod: "cash",
      isCredit: false
    };

    dispatch({ type: "PLACE_ORDER", payload: orderPayload });
    toast.success("Order Placed Successfully!");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Your Bag</h2>
        <p className="text-sm text-gray-500">{state.cart.length} Items</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p>Your bag is empty</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div key={item.productId} className="flex gap-3">
                <div className="h-16 w-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.product?.imageUrl && <img src={item.product.imageUrl} className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product?.name}</p>
                  <p className="text-sm text-gray-500">{formatINR(item.product?.price || 0)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => dispatch({ type: "CART_REMOVE", productId: item.productId })} className="p-1 hover:bg-gray-100 rounded">
                      {item.qty === 1 ? <Trash2 className="h-4 w-4 text-red-500" /> : <Minus className="h-4 w-4" />}
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.qty}</span>
                    <button onClick={() => dispatch({ type: "CART_ADD", productId: item.productId })} className="p-1 hover:bg-gray-100 rounded">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right font-medium">
                  {formatINR((item.product?.price || 0) * item.qty)}
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="font-medium text-sm">Customer Details</h3>
          {settings.requireCustomerDetails && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Notes (Optional)</Label>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Less spicy, extra sauce..." />
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium">Total</span>
          <span className="text-xl font-bold">{formatINR(total)}</span>
        </div>
        <Button className="w-full h-12 text-base font-bold bg-black text-white hover:bg-gray-900" disabled={cartItems.length === 0} onClick={handlePlaceOrder}>
          Place Order <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}