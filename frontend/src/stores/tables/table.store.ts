import { create } from 'zustand';
import { apiClient, type ApiError } from '@/lib/api-client';
import type {
    RestaurantTable,
    RestaurantHall,
    CreateTablePayload,
    UpdateTablePayload,
    CreateHallPayload,
    BulkCreateTablesResult,
    TableAvailabilityEntry,
} from '@/types/table';
import type {
    TableReservation,
    CreateTableReservationPayload,
    UpdateTableReservationPayload,
    ReservationAlert,
} from '@/types/reservation';

type TableState = {
    tables: RestaurantTable[];
    halls: RestaurantHall[];
    reservations: TableReservation[];
    loading: boolean;
    error: ApiError | null;

    fetchTables: () => Promise<void>;
    fetchHalls: () => Promise<void>;
    addTable: (data: CreateTablePayload) => Promise<boolean>;
    bulkAddTables: (data: CreateTablePayload[]) => Promise<BulkCreateTablesResult | null>;
    updateTable: (id: string, data: UpdateTablePayload) => Promise<boolean>;
    deleteTable: (id: string) => Promise<boolean>;
    addHall: (data: CreateHallPayload) => Promise<RestaurantHall | null>;
    fetchReservations: (query?: {
        from?: string;
        to?: string;
        status?: 'BOOKED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';
        table_id?: string;
    }) => Promise<void>;
    addReservation: (data: CreateTableReservationPayload) => Promise<TableReservation | null>;
    updateReservation: (id: string, data: UpdateTableReservationPayload) => Promise<TableReservation | null>;
    deleteReservation: (id: string) => Promise<boolean>;
    fetchTableAvailability: (startAt: string, endAt: string) => Promise<TableAvailabilityEntry[]>;
    fetchReservationAlerts: (from: string, to: string) => Promise<ReservationAlert[]>;
    generateQRCode: (id: string) => Promise<boolean>;
    regenerateAllQRCodes: () => Promise<boolean>;
    clearError: () => void;
};

export const useTableStore = create<TableState>((set, get) => ({
    tables: [],
    halls: [],
    reservations: [],
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

    bulkAddTables: async (data: CreateTablePayload[]) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post<{ data: BulkCreateTablesResult }>('/restaurant/tables/bulk', { tables: data });
            if (response.error) {
                set({ error: response.error, loading: false });
                return null;
            }

            const result = response.data?.data || null;
            if (!result) {
                set({
                    error: { code: 'CREATE_FAILED', message: 'Invalid bulk create response' },
                    loading: false
                });
                return null;
            }

            if (result.created_count > 0) {
                await get().fetchTables(); // Refresh list when something was created
            } else {
                set({ loading: false });
            }

            return result;
        } catch (err) {
            set({
                error: { code: 'CREATE_FAILED', message: err instanceof Error ? err.message : 'Failed to add tables' },
                loading: false
            });
            return null;
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

    fetchReservations: async (query) => {
        set({ loading: true, error: null });
        try {
            const params = new URLSearchParams();
            if (query?.from) params.set('from', query.from);
            if (query?.to) params.set('to', query.to);
            if (query?.status) params.set('status', query.status);
            if (query?.table_id) params.set('table_id', query.table_id);

            const queryString = params.toString();
            const endpoint = queryString
                ? `/restaurant/table-reservations?${queryString}`
                : '/restaurant/table-reservations';

            const response = await apiClient.get<{ data: TableReservation[] }>(endpoint);
            if (response.error) {
                set({ error: response.error, loading: false });
                return;
            }

            set({ reservations: response.data?.data || [], loading: false });
        } catch (err) {
            set({
                error: {
                    code: 'FETCH_FAILED',
                    message: err instanceof Error ? err.message : 'Failed to fetch reservations',
                },
                loading: false,
            });
        }
    },

    addReservation: async (data: CreateTableReservationPayload) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.post<{ data: TableReservation }>(
                '/restaurant/table-reservations',
                data
            );
            if (response.error) {
                set({ error: response.error, loading: false });
                return null;
            }

            const reservation = response.data?.data || null;
            if (reservation) {
                set((state) => ({ reservations: [reservation, ...state.reservations] }));
            }
            await get().fetchTables();
            set({ loading: false });
            return reservation;
        } catch (err) {
            set({
                error: {
                    code: 'CREATE_FAILED',
                    message: err instanceof Error ? err.message : 'Failed to create reservation',
                },
                loading: false,
            });
            return null;
        }
    },

    updateReservation: async (id: string, data: UpdateTableReservationPayload) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.patch<{ data: TableReservation }>(
                `/restaurant/table-reservations/${id}`,
                data
            );
            if (response.error) {
                set({ error: response.error, loading: false });
                return null;
            }

            const reservation = response.data?.data || null;
            if (reservation) {
                set((state) => ({
                    reservations: state.reservations.map((item) =>
                        item.id === id ? reservation : item
                    ),
                }));
            }
            await get().fetchTables();
            set({ loading: false });
            return reservation;
        } catch (err) {
            set({
                error: {
                    code: 'UPDATE_FAILED',
                    message: err instanceof Error ? err.message : 'Failed to update reservation',
                },
                loading: false,
            });
            return null;
        }
    },

    deleteReservation: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await apiClient.delete(`/restaurant/table-reservations/${id}`);
            if (response.error) {
                set({ error: response.error, loading: false });
                return false;
            }

            set((state) => ({
                reservations: state.reservations.filter((item) => item.id !== id),
            }));
            await get().fetchTables();
            set({ loading: false });
            return true;
        } catch (err) {
            set({
                error: {
                    code: 'DELETE_FAILED',
                    message: err instanceof Error ? err.message : 'Failed to delete reservation',
                },
                loading: false,
            });
            return false;
        }
    },

    fetchTableAvailability: async (startAt: string, endAt: string) => {
        try {
            const params = new URLSearchParams({
                start_at: startAt,
                end_at: endAt,
            });
            const response = await apiClient.get<{ data: TableAvailabilityEntry[] }>(
                `/restaurant/tables/availability?${params.toString()}`
            );
            if (response.error) {
                return [];
            }
            return response.data?.data || [];
        } catch {
            return [];
        }
    },

    fetchReservationAlerts: async (from: string, to: string) => {
        try {
            const params = new URLSearchParams({ from, to });
            const response = await apiClient.get<{ data: ReservationAlert[] }>(
                `/restaurant/table-reservations/alerts?${params.toString()}`
            );
            if (response.error) {
                return [];
            }
            return response.data?.data || [];
        } catch {
            return [];
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
