import { create } from 'zustand';
import type { ApiError } from '@/lib/api-client';
import type { Staff } from '@/api/staff';
import * as staffApi from '@/api/staff';

type StaffState = {
  // Data
  staff: Staff[];
  
  // Loading states
  loading: boolean;
  
  // Error state
  error: ApiError | null;
  
  // Actions
  fetchStaff: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  reset: () => void;
};

const initialState = {
  staff: [],
  loading: false,
  error: null,
};

export const useStaffStore = create<StaffState>((set) => ({
  ...initialState,

  // ========================================
  // Staff operations
  // ========================================

  fetchStaff: async () => {
    set({ loading: true, error: null });
    
    try {
      const staff = await staffApi.listStaff();
      set({
        staff,
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: {
          code: 'FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch staff',
        },
        loading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
  
  reset: () => set(initialState),
}));
