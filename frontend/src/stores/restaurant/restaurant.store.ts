import { create } from 'zustand';
import { apiClient, type ApiError } from '@/lib/api-client';
import type {
  RestaurantProfile,
  RestaurantThemeSettings,
  UpdateRestaurantProfilePayload,
  UpdateRestaurantSettingsPayload,
  UpdateRestaurantThemePayload,
  Restaurant,
} from '@/types/restaurant';

type RestaurantState = {
  // Data
  restaurant: RestaurantProfile | null;
  restaurants: Restaurant[];

  // Loading states
  loading: boolean;
  updating: boolean;

  // Error state
  error: ApiError | null;

  // Computed
  hasRestaurant: boolean;
  isSetupComplete: boolean;

  // Actions
  fetchRestaurant: () => Promise<void>;
  fetchRestaurants: () => Promise<void>;
  fetchThemeSettings: () => Promise<void>;
  updateProfile: (data: UpdateRestaurantProfilePayload) => Promise<boolean>;
  updateSettings: (data: UpdateRestaurantSettingsPayload) => Promise<boolean>;
  updateTheme: (data: UpdateRestaurantThemePayload) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
};

const initialState = {
  restaurant: null,
  restaurants: [],
  loading: false,
  updating: false,
  error: null,
  hasRestaurant: false,
  isSetupComplete: false,
};

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  ...initialState,

  fetchRestaurant: async () => {
    set({ loading: true, error: null });

    try {
      console.log('[Restaurant Store] Fetching restaurant profile...');
      const response = await apiClient.get<{ data: RestaurantProfile }>('/restaurant/profile');

      console.log('[Restaurant Store] Response:', {
        hasData: !!response.data,
        hasError: !!response.error,
        errorCode: response.error?.code,
      });

      if (response.error) {
        // 404 or 403 means no restaurant setup yet
        if (response.error.code === 'NOT_FOUND' || response.error.code === 'FORBIDDEN') {
          console.log('[Restaurant Store] No restaurant found, setting hasRestaurant=false');
          set({
            restaurant: null,
            hasRestaurant: false,
            isSetupComplete: false,
            loading: false,
            error: null, // Not an error, just not setup yet
          });
          return;
        }

        console.error('[Restaurant Store] Error fetching restaurant:', response.error);
        set({ error: response.error, loading: false });
        return;
      }

      const restaurant = response.data?.data;
      console.log('[Restaurant Store] Restaurant data:', {
        id: restaurant?.id,
        name: restaurant?.name,
        hasData: !!restaurant,
      });

      // Set restaurant ID in API client when we get the restaurant
      if (restaurant?.id) {
        console.log('[Restaurant Store] Setting restaurant ID in API client:', restaurant.id);
        apiClient.setRestaurantId(restaurant.id);
      }

      set({
        restaurant,
        hasRestaurant: !!restaurant,
        isSetupComplete: !!restaurant && !!restaurant.name,
        loading: false,
        error: null,
      });

      console.log('[Restaurant Store] State updated:', {
        hasRestaurant: !!restaurant,
        isSetupComplete: !!restaurant && !!restaurant.name,
      });

      // Fetch theme settings after restaurant is loaded
      if (restaurant?.id) {
        await get().fetchThemeSettings();
      }
    } catch (error) {
      console.error('[Restaurant Store] Exception:', error);
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch restaurant',
        },
        loading: false,
      });
    }
  },

  fetchRestaurants: async () => {
    set({ loading: true, error: null });

    try {
      const response = await apiClient.get<{ data: Restaurant[] }>('/restaurant/list');

      if (response.error) {
        set({ error: response.error, loading: false });
        return;
      }

      set({
        restaurants: response.data?.data || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch restaurants',
        },
        loading: false,
      });
    }
  },

  fetchThemeSettings: async () => {
    try {
      console.log('[Restaurant Store] Fetching theme settings...');
      const response = await apiClient.get<{ data: RestaurantThemeSettings | null }>('/restaurant/theme');

      if (response.error) {
        // If no theme exists (404), create default theme
        if (response.error.code === 'NOT_FOUND') {
          console.log('[Restaurant Store] No theme found, creating default theme...');
          const defaultTheme: UpdateRestaurantThemePayload = {
            theme_id: 'classic',
          };
          await get().updateTheme(defaultTheme);
          return;
        }
        console.error('[Restaurant Store] Error fetching theme settings:', response.error);
        return;
      }

      const theme = response.data?.data;
      if (theme) {
        // Update restaurant with theme settings
        set({
          restaurant: get().restaurant
            ? { ...get().restaurant!, theme_settings: theme }
            : get().restaurant
        });
        console.log('[Restaurant Store] Theme settings loaded:', theme.theme_id);
      }
    } catch (error) {
      console.error('[Restaurant Store] Exception fetching theme:', error);
    }
  },

  updateProfile: async (data: UpdateRestaurantProfilePayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<{ data: RestaurantProfile }>(
        '/restaurant/profile',
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return false;
      }

      const updated = response.data?.data;
      const current = get().restaurant;
      set({
        restaurant: updated ? { ...current!, ...updated } : current,
        updating: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update profile',
        },
        updating: false,
      });
      return false;
    }
  },

  updateSettings: async (data: UpdateRestaurantSettingsPayload) => {
    set({ updating: true, error: null });

    try {
      const response = await apiClient.patch<{ data: RestaurantProfile['settings'] }>(
        '/restaurant/settings',
        data
      );

      if (response.error) {
        set({ error: response.error, updating: false });
        return false;
      }

      const updatedSettings = response.data?.data;
      set({
        restaurant: get().restaurant
          ? { ...get().restaurant!, settings: updatedSettings || get().restaurant!.settings }
          : get().restaurant,
        updating: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update settings',
        },
        updating: false,
      });
      return false;
    }
  },

  updateTheme: async (data: UpdateRestaurantThemePayload) => {
    set({ updating: true, error: null });

    try {
      console.log('[Restaurant Store] Updating theme:', data.theme_id);
      const response = await apiClient.patch<{ data: RestaurantThemeSettings }>(
        '/restaurant/theme',
        data
      );

      if (response.error) {
        console.error('[Restaurant Store] Theme update failed:', response.error);
        set({ error: response.error, updating: false });
        return false;
      }

      const updatedTheme = response.data?.data;
      set({
        restaurant: get().restaurant
          ? { ...get().restaurant!, theme_settings: updatedTheme || get().restaurant!.theme_settings }
          : get().restaurant,
        updating: false,
        error: null,
      });

      console.log('[Restaurant Store] Theme updated successfully:', updatedTheme?.theme_id);
      return true;
    } catch (error) {
      console.error('[Restaurant Store] Exception updating theme:', error);
      set({
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update theme',
        },
        updating: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
