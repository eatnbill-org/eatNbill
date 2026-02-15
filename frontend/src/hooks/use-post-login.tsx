import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useRestaurantStore } from '@/stores/restaurant/restaurant.store';
import { useStaffStore } from '@/stores/staff/staff.store';
import { apiClient } from '@/lib/api-client';

/**
 * Post-login flow orchestrator
 * Handles the critical decision tree after successful authentication
 */
export function usePostLogin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const initialized = useRef(false);

  const {
    hasRestaurant,
    fetchRestaurant,
    loading: restaurantLoading,
  } = useRestaurantStore();

  const { fetchStaff } = useStaffStore();

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return;
    if (authLoading) return; // Wait for auth to complete

    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }

    console.log('[PostLogin] Auth complete, user:', {
      userId: user.id,
      role: user.role,
      allowed_restaurant_ids: user.allowed_restaurant_ids,
      restaurantIdInClient: apiClient.getRestaurantId(),
    });

    // Mark as initialized to prevent re-runs
    initialized.current = true;

    // User is authenticated - fetch restaurant and navigate
    const initializePostLogin = async () => {
      try {
        console.log('[PostLogin] Fetching restaurant profile...');
        await fetchRestaurant();

        console.log('[PostLogin] Authenticated, loading staff data and redirecting to admin...');

        // Load staff data if restaurant exists
        const restaurantId = apiClient.getRestaurantId();
        if (restaurantId) {
          await fetchStaff();
        }

        // Navigate to dashboard
        console.log('[PostLogin] Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } catch (error) {
        console.error('[PostLogin] Error during initialization:', error);
        // On error, still navigate to dashboard - it will handle missing data
        navigate('/admin/dashboard', { replace: true });
      }
    };

    initializePostLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]); // Only depend on authLoading and user

  return {
    loading: authLoading || (restaurantLoading && !initialized.current),
    hasRestaurant,
  };
}
