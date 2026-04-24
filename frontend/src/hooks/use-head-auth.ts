import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutStaffSession } from '@/lib/staff-session';
import { apiClient } from '@/lib/api-client';

interface StaffData {
    id: string;
    name: string;
    email: string;
    phone?: string;
    loginId?: string;
    role: string;
}

interface RestaurantData {
    id: string;
    name: string;
    slug: string;
}

export function useHeadAuth() {
    const navigate = useNavigate();
    const [staff, setStaff] = useState<StaffData | null>(null);
    const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadSession = async () => {
            const response = await apiClient.get<{ staff?: StaffData; restaurant?: RestaurantData }>('/auth/staff/me');
            if (cancelled) return;

            if (response.error || !response.data?.staff) {
                navigate('/auth/login', { replace: true });
                setIsLoading(false);
                return;
            }

            setStaff(response.data.staff);
            setRestaurant(response.data.restaurant ?? null);
            apiClient.setRestaurantId(response.data.restaurant?.id ?? null);
            apiClient.setTenantId((response.data.restaurant as { tenantId?: string } | undefined)?.tenantId ?? null);
            setIsLoading(false);
        };

        void loadSession();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const logout = useCallback(async () => {
        await logoutStaffSession();
        navigate('/auth/login');
    }, [navigate]);

    return { staff, restaurant, logout, isLoading };
}

// Backward-compatible export aliases
export const useStaffAuth = useHeadAuth;
export const useWaiterAuth = useHeadAuth;
