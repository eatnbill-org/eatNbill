import { create } from 'zustand';
import { apiClient, type ApiError } from '@/lib/api-client';
import type {
    RestaurantTable,
    RestaurantHall,
    CreateTablePayload,
    UpdateTablePayload,
    CreateHallPayload
} from '@/types/table';

type TableState = {
    tables: RestaurantTable[];
    halls: RestaurantHall[];
    loading: boolean;
    error: ApiError | null;

    fetchTables: () => Promise<void>;
    fetchHalls: () => Promise<void>;
    addTable: (data: CreateTablePayload) => Promise<boolean>;
    updateTable: (id: string, data: UpdateTablePayload) => Promise<boolean>;
    deleteTable: (id: string) => Promise<boolean>;
    addHall: (data: CreateHallPayload) => Promise<RestaurantHall | null>;
    generateQRCode: (id: string) => Promise<boolean>;
    regenerateAllQRCodes: () => Promise<boolean>;
    clearError: () => void;
};

export const useTableStore = create<TableState>((set, get) => ({
    tables: [],
    halls: [],
    loading: false,
    error: null,

    fetchTables: async () => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.get<{ data: RestaurantTable[] }>('/restaurant/tables');
            if (response.error) {
                set({ error: response.error, loading: false });
                return;
            }
            set({ tables: response.data?.data || [], loading: false });
        } catch (err) {
            set({
                error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Failed to fetch tables' },
                loading: false
            });
        }
    },

    fetchHalls: async () => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.get<{ data: RestaurantHall[] }>('/restaurant/halls');
            if (response.error) {
                set({ error: response.error, loading: false });
                return;
            }
            set({ halls: response.data?.data || [], loading: false });
        } catch (err) {
            set({
                error: { code: 'FETCH_FAILED', message: err instanceof Error ? err.message : 'Failed to fetch halls' },
                loading: false
            });
        }
    },

    addTable: async (data: CreateTablePayload) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post<{ data: RestaurantTable }>('/restaurant/tables', data);
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }
            await get().fetchTables(); // Refresh list
            return true;
        } catch (err) {
            set({
                error: { code: 'CREATE_FAILED', message: err instanceof Error ? err.message : 'Failed to add table' },
                loading: false
            });
            return false;
        }
    },

    updateTable: async (id: string, data: UpdateTablePayload) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.patch<{ data: RestaurantTable }>(`/restaurant/tables/${id}`, data);
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }
            await get().fetchTables();
            return true;
        } catch (err) {
            set({
                error: { code: 'UPDATE_FAILED', message: err instanceof Error ? err.message : 'Failed to update table' },
                loading: false
            });
            return false;
        }
    },

    deleteTable: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.delete(`/restaurant/tables/${id}`);
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }
            await get().fetchTables();
            return true;
        } catch (err) {
            set({
                error: { code: 'DELETE_FAILED', message: err instanceof Error ? err.message : 'Failed to delete table' },
                loading: false
            });
            return false;
        }
    },

    addHall: async (data: CreateHallPayload) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post<{ data: RestaurantHall }>('/restaurant/halls', data);
            if (response.error) {
                set({ error: response.error, loading: false });
                return null;
            }
            const newHall = response.data?.data;
            await get().fetchHalls();
            set({ loading: false });
            return newHall || null;
        } catch (err) {
            set({
                error: { code: 'CREATE_FAILED', message: err instanceof Error ? err.message : 'Failed to add hall' },
                loading: false
            });
            return null;
        }
    },

    generateQRCode: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.get(`/restaurant/tables/${id}/qrcode`);
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }
            await get().fetchTables();
            return true;
        } catch (err) {
            set({
                error: { code: 'QR_FAILED', message: err instanceof Error ? err.message : 'Failed to generate QR code' },
                loading: false
            });
            return false;
        }
    },

    regenerateAllQRCodes: async () => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post('/restaurant/tables/qrcodes/regenerate', {});
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }
            await get().fetchTables();
            return true;
        } catch (err) {
            set({
                error: { code: 'QR_FAILED', message: err instanceof Error ? err.message : 'Failed to regenerate QR codes' },
                loading: false
            });
            return false;
        }
    },

    clearError: () => set({ error: null }),
}));
