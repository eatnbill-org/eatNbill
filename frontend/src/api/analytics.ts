import { apiClient } from '@/lib/api-client';

export interface AnalyticsTrend {
    period: string;
    revenue: number;
    orders: number;
}

export interface AnalyticsDistribution {
    name: string;
    value: number;
}

export interface AnalyticsDebt {
    customer: string;
    phone: string;
    amount: number;
}

export interface AnalyticsMetrics {
    totalRevenue: number;
    totalOrders: number;
    totalCost: number;
    totalProfit: number;
}

export interface AnalyticsProduct {
    name: string;
    quantity: number;
    revenue: number;
}

export interface AdvancedAnalyticsResponse {
    trends: AnalyticsTrend[];
    distribution: AnalyticsDistribution[];
    products: AnalyticsProduct[];
    debts: AnalyticsDebt[];
    metrics: AnalyticsMetrics;
}

export const getAdvancedAnalytics = async (view: string, date: string): Promise<AdvancedAnalyticsResponse> => {
    const response = await apiClient.get<AdvancedAnalyticsResponse>(`/orders/advanced-analytics?view=${view}&date=${date}`);

    if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch analytics data');
    }

    if (!response.data) {
        throw new Error('No data returned from analytics API');
    }

    return (response.data as any).data;
};
