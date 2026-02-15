/**
 * Staff/User domain types
 * Matches backend Prisma schema and API responses
 */

export type UserRole = 'OWNER' | 'MANAGER' | 'WAITER';

export type RestaurantRole = 'OWNER' | 'MANAGER' | 'WAITER';

export type StaffUser = {
  id: string;
  supabase_id: string;
  tenant_id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RestaurantUser = {
  id: string;
  user_id: string;
  restaurant_id: string;
  role: RestaurantRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: StaffUser;
};

// Create/Update payloads
export type InviteStaffPayload = {
  email: string;
  role: 'MANAGER' | 'WAITER';
};

export type UpdateStaffRolePayload = {
  role: 'MANAGER' | 'WAITER';
};

export type CreateRestaurantUserPayload = {
  user_id: string;
  role: RestaurantRole;
  is_active?: boolean;
};

export type UpdateRestaurantUserPayload = {
  role?: RestaurantRole;
  is_active?: boolean;
};
