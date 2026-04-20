export type ReservationStatus = 'BOOKED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';

export interface TableReservation {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  table_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  party_size: number;
  reserved_from: string;
  reserved_to: string;
  notes: string | null;
  status: ReservationStatus;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  table?: {
    id: string;
    table_number: string;
    seats: number;
    hall_id: string;
    hall?: {
      id: string;
      name: string;
      is_ac: boolean;
    };
  };
}

export interface CreateTableReservationPayload {
  table_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  party_size: number;
  reserved_from: string;
  reserved_to: string;
  notes?: string | null;
  status?: ReservationStatus;
}

export interface UpdateTableReservationPayload {
  table_id?: string;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  party_size?: number;
  reserved_from?: string;
  reserved_to?: string;
  notes?: string | null;
  status?: ReservationStatus;
}

export interface ReservationAlert {
  event_type: 'T_MINUS_10' | 'START';
  event_at: string;
  reservation: TableReservation;
}
