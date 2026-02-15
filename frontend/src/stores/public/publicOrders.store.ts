import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import type { PublicProduct } from '@/types/product';

interface CartItem {
    product_id: string;
    product: PublicProduct;
    quantity: number;
    notes?: string;
}

interface CustomerInfo {
    name: string;
    phone: string;
}

interface PublicOrdersState {
    // Cart state
    items: CartItem[];
    customerInfo: CustomerInfo | null;

    // UI state
    isCartOpen: boolean;
    isOrdering: boolean;
    orderError: string | null;
    lastOrder: any | null;

    // Actions
    addItem: (product: PublicProduct) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    setCustomerInfo: (info: CustomerInfo) => void;
    setCartOpen: (open: boolean) => void;

    // Order Action
    placeOrder: (restaurantSlug: string, tableId?: string) => Promise<boolean>;
}

export const usePublicOrdersStore = create<PublicOrdersState>()(
    persist(
        (set, get) => ({
            items: [],
            customerInfo: null,
            isCartOpen: false,
            isOrdering: false,
            orderError: null,
            lastOrder: null,

            addItem: (product) => {
                const { items } = get();
                const existing = items.find((i) => i.product_id === product.id);

                if (existing) {
                    set({
                        items: items.map((i) =>
                            i.product_id === product.id
                                ? { ...i, quantity: i.quantity + 1 }
                                : i
                        ),
                    });
                } else {
                    set({
                        items: [...items, { product_id: product.id, product, quantity: 1 }],
                    });
                }
            },

            removeItem: (productId) => {
                set({
                    items: get().items.filter((i) => i.product_id !== productId),
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }
                set({
                    items: get().items.map((i) =>
                        i.product_id === productId ? { ...i, quantity } : i
                    ),
                });
            },

            clearCart: () => set({ items: [], orderError: null }),

            setCustomerInfo: (customerInfo) => set({ customerInfo }),

            setCartOpen: (isCartOpen) => set({ isCartOpen }),

            placeOrder: async (restaurantSlug, tableId) => {
                const { items, customerInfo } = get();

                if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
                    set({ orderError: 'Customer information is required' });
                    return false;
                }

                if (items.length === 0) {
                    set({ orderError: 'Cart is empty' });
                    return false;
                }

                set({ isOrdering: true, orderError: null });

                try {
                    const payload = {
                        customer_name: customerInfo.name,
                        customer_phone: customerInfo.phone,
                        source: tableId ? 'QR' : 'WEB',
                        table_id: tableId,
                        items: items.map((item) => ({
                            product_id: item.product_id,
                            quantity: item.quantity,
                            notes: item.notes,
                        })),
                    };

                    const response = await apiClient.post<any>(
                        `/public/${restaurantSlug}/orders`,
                        payload
                    );

                    if (response.error) {
                        set({ orderError: response.error.message, isOrdering: false });
                        return false;
                    }

                    set({
                        lastOrder: response.data,
                        isOrdering: false,
                        items: [], // Clear cart on success
                    });

                    return true;
                } catch (err) {
                    set({
                        orderError: err instanceof Error ? err.message : 'Failed to place order',
                        isOrdering: false,
                    });
                    return false;
                }
            },
        }),
        {
            name: 'public-cart-storage',
            partialize: (state) => ({
                items: state.items,
                customerInfo: state.customerInfo,
            }),
        }
    )
);
