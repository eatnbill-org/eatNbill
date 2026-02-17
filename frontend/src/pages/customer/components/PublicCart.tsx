import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePublicOrdersStore } from '@/stores/public/publicOrders.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, X, Plus, Minus, User } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { useParams } from 'react-router-dom';

export function PublicCart({ onOrderSuccess }: { onOrderSuccess?: () => void }) {
    const { slug } = useParams<{ slug: string }>();
    // tableId from query params? Usually QR codes have tableId in URL
    const [params] = useSearchParams();
    const tableId = params.get('tableId') || params.get('table') || undefined;

    const {
        items,
        isCartOpen,
        setCartOpen,
        updateQuantity,
        removeItem,
        customerInfo,
        setCustomerInfo,
        placeOrder,
        isOrdering,
        orderError,
    } = usePublicOrdersStore();

    const [formName, setFormName] = React.useState(customerInfo?.name || '');
    const [formPhone, setFormPhone] = React.useState(customerInfo?.phone || '');
    const [showCheckout, setShowCheckout] = React.useState(false);

    const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);

    if (!isCartOpen) {
        return null;
    }

    const handleOrder = async () => {
        if (!customerInfo && (!formName || !formPhone)) {
            alert('Please enter your details');
            return;
        }

        if (!customerInfo) {
            setCustomerInfo({ name: formName, phone: formPhone });
        }

        const success = await placeOrder(slug!, tableId);
        if (success) {
            onOrderSuccess?.();
            setCartOpen(false);
            setShowCheckout(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ fontFamily: 'var(--theme-font)' }}>
            <Card className="w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 rounded-t-2xl sm:rounded-2xl"
                style={{
                    borderRadius: 'var(--theme-radius)',
                    borderColor: 'var(--theme-primary)'
                }}
            >
                <CardHeader className="flex flex-row items-center justify-between border-b px-4 sm:px-6 py-4"
                    style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}
                >
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Your Cart
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)} className="rounded-full hover:bg-black/5">
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0">
                    {!showCheckout ? (
                        <div className="p-4 sm:p-6 space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>Your cart is empty</p>
                                    <Button variant="link" onClick={() => setCartOpen(false)}>Continue Shopping</Button>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.product_id} className="flex items-center gap-4 py-4 border-b last:border-0 border-black/5">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm" style={{ color: 'var(--theme-primary)' }}>{item.product.name}</h4>
                                            <p className="text-xs opacity-70">{formatINR(Number(item.product.price))}</p>
                                        </div>
                                        <div className="flex items-center gap-3 border rounded-full px-2 py-1" style={{ borderColor: 'var(--theme-primary)' }}>
                                            <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="p-1 hover:opacity-70">
                                                <Minus className="h-3 w-3" />
                                            </button>
                                            <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)} className="p-1 hover:opacity-70">
                                                <Plus className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="text-sm font-black w-20 text-right" style={{ color: 'var(--theme-accent)' }}>
                                            {formatINR(Number(item.product.price) * item.quantity)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="p-4 sm:p-6 space-y-6">
                            <div className="text-center">
                                <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <User className="h-8 w-8" />
                                </div>
                                <h3 className="text-lg font-bold">Your Details</h3>
                                <p className="text-gray-500 text-sm">Required to process your order</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cust-name">Full Name</Label>
                                    <Input
                                        id="cust-name"
                                        placeholder="Enter your name"
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="h-12 border-2 focus:ring-0"
                                        style={{ borderRadius: 'var(--theme-radius)', borderColor: 'var(--theme-primary)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cust-phone">Phone Number</Label>
                                    <Input
                                        id="cust-phone"
                                        type="tel"
                                        placeholder="E.g. +91 9999999999"
                                        value={formPhone}
                                        onChange={(e) => setFormPhone(e.target.value)}
                                        className="h-12 border-2 focus:ring-0"
                                        style={{ borderRadius: 'var(--theme-radius)', borderColor: 'var(--theme-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 p-4 sm:p-6 border-t bg-gray-50">
                    <div className="flex justify-between w-full text-lg font-bold">
                        <span>Total</span>
                        <span>{formatINR(total)}</span>
                    </div>

                    {orderError && (
                        <p className="text-xs text-red-500 text-center w-full">{orderError}</p>
                    )}

                    {!showCheckout ? (
                        <Button
                            className="w-full h-14 text-lg font-bold shadow-lg transition-transform active:scale-[0.98]"
                            style={{
                                backgroundColor: 'var(--theme-primary)',
                                color: 'var(--theme-secondary)',
                                borderRadius: 'var(--theme-radius)'
                            }}
                            disabled={items.length === 0}
                            onClick={() => {
                                if (customerInfo) handleOrder();
                                else setShowCheckout(true);
                            }}
                        >
                            {customerInfo ? 'Place Order' : 'Checkout'}
                        </Button>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                            <Button variant="outline" className="h-14 border-2"
                                style={{ borderRadius: 'var(--theme-radius)', borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                                onClick={() => setShowCheckout(false)}
                            >
                                Back
                            </Button>
                            <Button
                                className="h-14 text-lg font-bold shadow-lg transition-transform active:scale-[0.98]"
                                style={{
                                    backgroundColor: 'var(--theme-primary)',
                                    color: 'var(--theme-secondary)',
                                    borderRadius: 'var(--theme-radius)'
                                }}
                                onClick={handleOrder}
                                disabled={isOrdering || !formName || !formPhone}
                            >
                                {isOrdering ? 'Placing...' : 'Confirm Order'}
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
