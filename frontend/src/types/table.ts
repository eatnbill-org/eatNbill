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
    created_at: string;
    hall?: {
        id: string;
        name: string;
        is_ac: boolean;
    };
    qr_code?: TableQRCode;
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
