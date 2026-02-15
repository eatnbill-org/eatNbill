export interface Customer {
    id: string;
    tenant_id: string;
    restaurant_id: string;
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    notes?: string;
    credit_balance: string | number;
    created_at: string;
    updated_at: string;
    // Computed fields from backend
    totalOrders: number;
    totalSpent: number;
    lastVisit: string;
}

export interface CustomerAnalytics {
    customer: {
        id: string;
        name: string;
        phone: string;
        email?: string;
        tags: string[];
        visit_count: number;
        first_visit_date: string | null;
        last_visit_date: string | null;
        last_order_date: string | null;
        total_spent: number;
        average_order_value: number;
        credit_balance: number;
        is_loyal: boolean;
    };
    period: {
        days: number;
        since: string;
        orders_count: number;
        total_spent: number;
        average_order_value: number;
    };
    favoriteItems: Array<{
        product_id: string;
        name: string;
        order_count: number;
        total_quantity: number;
    }>;
    visitPatterns: {
        byDayOfWeek: Record<number, number>;
        byHour: Record<number, number>;
    };
}

export interface ListCustomersResponse {
    data: Customer[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
