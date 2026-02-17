import { apiClient } from '@/lib/api-client';

export interface TableQRCode {
    id: string;
    table_id: string;
    menu_url: string;
    table_number?: string;
    hall_name?: string | null;
    qr_png_url: string;
    qr_pdf_url: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get QR code for a specific table
 */
export async function getTableQRCode(tableId: string): Promise<TableQRCode> {
    const response = await apiClient.get(`/restaurant/tables/${tableId}/qrcode`);
    return response.data?.data;
}

/**
 * Regenerate QR code for a specific table
 */
export async function regenerateTableQRCode(tableId: string): Promise<TableQRCode> {
    const response = await apiClient.post(`/restaurant/tables/${tableId}/qrcode/regenerate`, {});
    return response.data?.data;
}

/**
 * Regenerate QR codes for all tables
 */
export async function regenerateAllQRCodes(): Promise<{
    regenerated: number;
    items: Array<{
        table_id: string;
        table_number: string;
        hall_name: string;
        menu_url: string;
        qr_png_url: string;
        qr_pdf_url: string;
    }>;
}> {
    const response = await apiClient.post('/restaurant/tables/qrcodes/regenerate', {});
    return response.data?.data;
}

export interface DeleteTableQRCodesPayload {
    mode: 'ALL' | 'HALL' | 'RANGE' | 'SELECTED';
    hall_id?: string;
    range_start?: number;
    range_end?: number;
    table_ids?: string[];
}

export async function deleteTableQRCodes(payload: DeleteTableQRCodesPayload): Promise<{
    deleted_count: number;
    failed_count: number;
    deleted_tables: string[];
    failed_tables: string[];
}> {
    const response = await apiClient.post('/restaurant/tables/qrcodes/delete', payload);
    return response.data?.data;
}
