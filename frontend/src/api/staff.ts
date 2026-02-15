import { apiClient } from '@/lib/api-client';

// API functions for staff management using shared apiClient

export interface Staff {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    role: 'MANAGER' | 'WAITER';
    isActive: boolean;
    createdAt: string;
    salary?: string;
    shiftDetail?: string;
}

export interface StaffDetails extends Staff {
    orders: {
        id: string;
        orderNumber: number;
        customerName: string;
        totalAmount: number;
        status: string;
        paymentStatus: string;
        placedAt: string;
    }[];
}

export interface CreateStaffInput {
    name: string;
    role: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    salary?: string;
    shiftDetail?: string;
}

export interface UpdateStaffInput {
    name?: string;
    role?: 'MANAGER' | 'WAITER';
    email?: string;
    phone?: string;
    password?: string;
    address?: string;
    isActive?: boolean;
    salary?: string;
    shiftDetail?: string;
}

export async function listStaff(): Promise<Staff[]> {
    const response = await apiClient.get('/restaurant/staff');
    if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch staff');
    }
    return response.data;
}

export async function getStaffDetails(staffId: string): Promise<StaffDetails> {
    const response = await apiClient.get(`/restaurant/staff/${staffId}`);
    if (response.error) {
        throw new Error(response.error.message || 'Failed to fetch staff details');
    }
    return response.data;
}

export async function createStaff(input: CreateStaffInput): Promise<Staff> {
    const response = await apiClient.post('/restaurant/staff', input);
    if (response.error) {
        throw new Error(response.error.message || 'Failed to create staff');
    }
    return response.data;
}

export async function updateStaff(staffId: string, input: UpdateStaffInput): Promise<Staff> {
    const response = await apiClient.patch(`/restaurant/staff/${staffId}`, input);
    if (response.error) {
        throw new Error(response.error.message || 'Failed to update staff');
    }
    return response.data;
}

export async function toggleStaffStatus(staffId: string): Promise<{ id: string; isActive: boolean; message: string }> {
    const response = await apiClient.patch(`/restaurant/staff/${staffId}/toggle`);
    if (response.error) {
        throw new Error(response.error.message || 'Failed to toggle staff status');
    }
    return response.data;
}

export async function deleteStaff(staffId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/restaurant/staff/${staffId}`);
    if (response.error) {
        throw new Error(response.error.message || 'Failed to delete staff');
    }
    return response.data;
}

export async function getSharedLogin(): Promise<{ email: string; loginId?: string }> {
    const response = await apiClient.get('/restaurant/staff/shared-login');
    if (response.error) {
        // Return empty email if error (e.g., not set up yet)
        return { email: '' };
    }
    return response.data;
}

export async function setupSharedLogin(email: string, password?: string): Promise<{ email: string; loginId?: string }> {
    const response = await apiClient.post('/restaurant/staff/shared-login', { email, password });
    if (response.error) {
        throw new Error(response.error.message || 'Failed to setup shared login');
    }
    return response.data;
}
