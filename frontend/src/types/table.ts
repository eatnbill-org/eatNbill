export interface TableQRCode {
    id: string;
    table_id: string;
    menu_url: string;
    qr_png_url: string | null;
    qr_pdf_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface RestaurantTable {
    id: string;
    restaurant_id: string;
    hall_id: string;
    table_number: string;
    seats: number;
    is_active: boolean;
    table_status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';
    x_position?: number | null;
    y_position?: number | null;
    shape?: 'RECTANGLE' | 'CIRCLE' | null;
    created_at: string;
    hall?: {
        id: string;
        name: string;
        is_ac: boolean;
    };
    qr_code?: TableQRCode;
    is_reserved_now?: boolean;
    current_reservation?: {
        id: string;
        customer_name: string;
        customer_phone: string | null;
        customer_email?: string | null;
        party_size: number;
        reserved_from: string;
        reserved_to: string;
        status: 'BOOKED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';
        notes?: string | null;
    } | null;
    next_reservation?: {
        id: string;
        customer_name: string;
        customer_phone: string | null;
        customer_email?: string | null;
        party_size: number;
        reserved_from: string;
        reserved_to: string;
        status: 'BOOKED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';
        notes?: string | null;
    } | null;
}

export interface RestaurantHall {
    id: string;
    restaurant_id: string;
    name: string;
    is_ac: boolean;
    created_at: string;
}

export interface CreateTablePayload {
    hall_id: string;
    table_number: string;
    seats: number;
    is_active?: boolean;
}

export interface UpdateTablePayload {
    hall_id?: string;
    table_number?: string;
    seats?: number;
    is_active?: boolean;
}

export interface CreateHallPayload {
    name: string;
    is_ac?: boolean;
}

export interface BulkCreateTableError {
    table_number: string;
    error: string;
}

export interface BulkCreateTablesResult {
    attempted_count: number;
    created_count: number;
    failed_count: number;
    created: RestaurantTable[];
    errors: BulkCreateTableError[];
    success: boolean;
}

export interface TableAvailabilityEntry extends RestaurantTable {
    is_available: boolean;
    conflicting_reservations: Array<{
        id: string;
        table_id: string;
        customer_name: string;
        customer_phone: string | null;
        customer_email?: string | null;
        party_size: number;
        reserved_from: string;
        reserved_to: string;
        status: 'BOOKED' | 'SEATED' | 'CANCELLED' | 'COMPLETED';
    }>;
}
