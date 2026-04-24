/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from '@/lib/api-client';

async function requestOrThrow<T = any>(endpoint: string, options?: RequestInit & { body?: any }) {
  const method = options?.method || 'GET';
  const response = await apiClient.request<T>(endpoint, {
    ...options,
    method,
    body:
      options?.body instanceof FormData
        ? options.body
        : options?.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  if (response.error) {
    throw new Error(response.error.message || 'Request failed');
  }

  return response.data;
}

export async function fetchStaffOrders() {
  return requestOrThrow('orders');
}

export async function fetchOrderById(orderId: string) {
  return requestOrThrow(`orders/${orderId}`);
}

export async function updateOrderStatus(orderId: string, status: string, cancel_reason?: string) {
  return requestOrThrow(`orders/${orderId}/status`, {
    method: 'PATCH',
    body: {
      status,
      ...(cancel_reason ? { cancel_reason } : {}),
    },
  });
}

export async function markOrderPaid(orderId: string, paymentMethod: string) {
  return requestOrThrow(`orders/${orderId}/payment`, {
    method: 'PATCH',
    body: {
      payment_method: paymentMethod.toUpperCase(),
      payment_status: 'PAID',
    },
  });
}

export async function fetchProducts() {
  return requestOrThrow('products');
}

export async function addOrderItems(orderId: string, items: Array<{ product_id: string; quantity: number }>) {
  return requestOrThrow(`orders/${orderId}/items`, {
    method: 'POST',
    body: { items },
  });
}

export async function createOrder(payload: {
  customer_name?: string;
  customer_phone?: string;
  items: Array<{ product_id: string; quantity: number; notes?: string }>;
  order_type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  table_id?: string;
  hall_id?: string;
  notes?: string;
}) {
  return requestOrThrow('orders', {
    method: 'POST',
    body: {
      ...payload,
      source: 'MANUAL',
    },
  });
}

export async function fetchTables() {
  return requestOrThrow('restaurant/tables');
}

export async function fetchHalls() {
  return requestOrThrow('restaurant/halls');
}

export async function updateTableStatus(tableId: string, table_status: 'AVAILABLE' | 'RESERVED') {
  return requestOrThrow(`restaurant/tables/${tableId}/status`, {
    method: 'PATCH',
    body: { table_status },
  });
}

export async function fetchCategories() {
  return requestOrThrow('categories');
}

export const fetchWaiterOrders = fetchStaffOrders;

export async function updateOrderItemStatus(orderId: string, itemId: string, status: string) {
  return requestOrThrow(`orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function toggleProductAvailability(productId: string, isAvailable: boolean) {
  return requestOrThrow(`products/${productId}`, {
    method: 'PATCH',
    body: { isAvailable },
  });
}

export async function updateOrderItem(orderId: string, itemId: string, payload: { quantity?: number; notes?: string }) {
  return requestOrThrow(`orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function removeOrderItem(orderId: string, itemId: string) {
  return requestOrThrow(`orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function acceptQROrder(orderId: string): Promise<any> {
  return requestOrThrow(`orders/${orderId}/accept`, {
    method: 'POST',
  });
}

export async function rejectQROrder(orderId: string, reason?: string): Promise<any> {
  return requestOrThrow(`orders/${orderId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export async function searchCustomerByPhone(phone: string) {
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) {
    return null;
  }

  const response = await requestOrThrow<{ data?: Array<{ id: string; name: string; phone: string }> }>(
    `customers?search=${encodeURIComponent(normalizedPhone)}&limit=10`
  );

  const customers = Array.isArray(response?.data) ? response.data : [];
  const exactMatch = customers.find((customer) => customer.phone?.trim() === normalizedPhone);

  return exactMatch ?? null;
}
