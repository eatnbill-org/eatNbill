import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Customer, CustomerAnalytics, ListCustomersResponse } from '@/types/customer';

export function useCustomers(params: { search?: string; tags?: string; page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['customers', params],
        queryFn: async () => {
            const query = new URLSearchParams();
            if (params.search) query.set('search', params.search);
            if (params.tags) query.set('tags', params.tags);
            if (params.page) query.set('page', params.page.toString());
            if (params.limit) query.set('limit', params.limit.toString());

            const response = await apiClient.get<ListCustomersResponse>(`/customers?${query.toString()}`);
            if (response.error) throw new Error(response.error.message);
            return response.data;
        },
    });
}

export function useCustomer(customerId: string) {
    return useQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
            const response = await apiClient.get<{ data: Customer }>(`/customers/${customerId}`);
            if (response.error) throw new Error(response.error.message);
            return response.data.data;
        },
        enabled: !!customerId,
    });
}

export function useCustomerAnalytics(customerId: string, days = 90) {
    return useQuery({
        queryKey: ['customer-analytics', customerId, days],
        queryFn: async () => {
            const response = await apiClient.get<{ data: CustomerAnalytics }>(`/customers/${customerId}/analytics?days=${days}`);
            if (response.error) throw new Error(response.error.message);
            return response.data.data;
        },
        enabled: !!customerId,
    });
}

export function useCustomerOrders(customerId: string, page = 1, limit = 20) {
    return useQuery({
        queryKey: ['customer-orders', customerId, page, limit],
        queryFn: async () => {
            const response = await apiClient.get<any>(`/customers/${customerId}/orders?page=${page}&limit=${limit}`);
            if (response.error) throw new Error(response.error.message);
            return response.data;
        },
        enabled: !!customerId,
    });
}

export function useCreateCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { name: string; phone: string; email?: string; notes?: string }) => {
            const response = await apiClient.post<{ data: Customer }>('/customers', data);
            if (response.error) throw new Error(response.error.message);
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
        },
    });
}

export function useUpdateCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
            const response = await apiClient.patch<{ data: Customer }>(`/customers/${id}`, data);
            if (response.error) throw new Error(response.error.message);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
        },
    });
}

export function useUpdateCustomerCredit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
            const response = await apiClient.patch<{ data: Customer }>(`/customers/${id}/credit`, { amount });
            if (response.error) throw new Error(response.error.message);
            return response.data.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
            queryClient.invalidateQueries({ queryKey: ['customer-analytics', data.id] });
        },
    });
}

export function useDeleteCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.delete(`/customers/${id}`);
            if (response.error) throw new Error(response.error.message);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['customer', id] });
            queryClient.invalidateQueries({ queryKey: ['customer-analytics', id] });
        },
    });
}

/**
 * Public hook: Search for existing customer by phone number
 * Used during public checkout to detect duplicate entries
 */
export function useSearchCustomerByPhone(restaurantSlug: string, phone: string) {
    return useQuery({
        queryKey: ['search-customer', restaurantSlug, phone],
        queryFn: async () => {
            if (!phone || phone.length < 5) return null;
            
            const response = await apiClient.get<{ data: { id: string; name: string; phone: string } | null }>(
                `/public/${restaurantSlug}/customers/search?phone=${encodeURIComponent(phone)}`
            );
            if (response.error) return null;
            return response.data.data;
        },
        enabled: !!restaurantSlug && !!phone && phone.length >= 5,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    });
}

/**
 * Hook for staff orders: Search for customer by phone
 * Uses authenticated API call with staff token
 */
export function useSearchCustomerByPhoneStaff(phone: string) {
    return useQuery({
        queryKey: ['search-customer-staff', phone],
        queryFn: async () => {
            if (!phone || phone.length < 5) return null;
            
            // Dynamic import to avoid circular dependency
            const { searchCustomerByPhone } = await import('@/lib/staff-api');
            const customer = await searchCustomerByPhone(phone);
            return customer;
        },
        enabled: !!phone && phone.length >= 5,
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
    });
}
