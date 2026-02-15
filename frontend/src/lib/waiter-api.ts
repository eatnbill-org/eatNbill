// Staff API client
// Handles all API calls for staff-side functionality

const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Internal function to clean up double slashes
const cleanUrl = (url: string) => url.replace(/([^:]\/)\/+/g, "$1");

// Function to get proper path (prevents double /api/v1)
const getPath = (endpoint: string) => {
    let baseUrl = VITE_API_URL;

    // Remove trailing slash if present
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }

    // Ensure endpoint starts with slash
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If baseUrl already includes /api/v1, don't add it again
    if (baseUrl.includes('/api/v1')) {
        return cleanUrl(`${baseUrl}${path}`);
    }

    // Otherwise add it
    return cleanUrl(`${baseUrl}/api/v1${path}`);
};

/**
 * Get staff token from localStorage (with backward compatibility)
 */
function getStaffToken(): string | null {
    return localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
}

/**
 * Get restaurant ID from localStorage (with backward compatibility)
 */
function getRestaurantId(): string | null {
    const restaurantData = localStorage.getItem('staff_restaurant') || localStorage.getItem('waiter_restaurant');
    if (!restaurantData) return null;
    try {
        const parsed = JSON.parse(restaurantData);
        return parsed.id || null;
    } catch {
        return null;
    }
}

/**
 * Fetch all orders for the staff member's restaurant
 */
export async function fetchStaffOrders() {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath('orders'), {
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch orders');
    }

    return response.json();
}

/**
 * Fetch specific order by ID
 */
export async function fetchOrderById(orderId: string) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath(`orders/${orderId}`), {
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch order');
    }

    return response.json();
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: string) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath(`orders/${orderId}/status`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
    }

    return response.json();
}

/**
 * Mark order as paid
 */
export async function markOrderPaid(orderId: string, paymentMethod: string) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath(`orders/${orderId}/payment`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
            payment_method: paymentMethod.toUpperCase(),
            payment_status: 'PAID',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to mark as paid');
    }

    return response.json();
}

/**
 * Fetch products/menu items (for stock page)
 */
export async function fetchProducts() {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath('products'), {
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch products');
    }

    return response.json();
}

/**
 * Add items to an existing order
 */
export async function addOrderItems(orderId: string, items: Array<{ product_id: string; quantity: number }>) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath(`orders/${orderId}/items`), {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add items');
    }

    return response.json();
}

/**
 * Create a new order (internal/staff)
 */
export async function createOrder(payload: {
    customer_name: string;
    customer_phone: string;
    items: Array<{ product_id: string; quantity: number; notes?: string }>;
    table_id?: string;
    notes?: string;
}) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const body = {
        ...payload,
        source: 'MANUAL',
        order_type: payload.table_id ? 'DINE_IN' : 'TAKEAWAY',
    };

    const response = await fetch(getPath('orders'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
    }

    return response.json();
}

/**
 * Fetch tables for the restaurant
 */
export async function fetchTables() {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath('restaurant/tables'), {
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch tables');
    }

    return response.json();
}

/**
 * Fetch categories (for stock page filter)
 */
export async function fetchCategories() {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath('categories'), {
        headers,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch categories');
    }

    return response.json();
}

// Backward-compatible export alias
export const fetchWaiterOrders = fetchStaffOrders;

/**
 * Update status of an individual order item
 */
export async function updateOrderItemStatus(orderId: string, itemId: string, status: string) {
    const token = getStaffToken();
    const restaurantId = getRestaurantId();

    if (!token) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    if (restaurantId) {
        headers['x-restaurant-id'] = restaurantId;
    }

    const response = await fetch(getPath(`orders/${orderId}/items/${itemId}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update item status');
    }

    return response.json();
}
