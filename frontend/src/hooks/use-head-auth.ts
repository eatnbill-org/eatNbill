import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutStaffSession } from '@/lib/staff-session';

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
        const token = localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
        const staffData = localStorage.getItem('staff_data') || localStorage.getItem('waiter_data');
        const restaurantData = localStorage.getItem('staff_restaurant') || localStorage.getItem('waiter_restaurant');

        if (!token || !staffData) {
            navigate('/auth/login');
            setIsLoading(false);
            return;
        }

        try {
            setStaff(JSON.parse(staffData));
            if (restaurantData) {
                setRestaurant(JSON.parse(restaurantData));
            }
        } catch (error) {
            console.error('Failed to parse staff data:', error);
            void logout();
        }

        setIsLoading(false);
    }, [navigate]);

    const logout = async () => {
        await logoutStaffSession();
        navigate('/auth/login');
    };

    return { staff, restaurant, logout, isLoading };
}

// Backward-compatible export aliases
export const useStaffAuth = useHeadAuth;
export const useWaiterAuth = useHeadAuth;
