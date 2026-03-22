import { apiClient } from '@/lib/api-client';
import type {
  DayEndClosure,
  ExportJob,
  GstInvoice,
  RestaurantOutlet,
  UserPreferenceResponse,
} from '@/types/enterprise-billing';
import type { ProductModifierGroup } from '@/types/product';

function unwrapData<T>(payload: unknown): T {
  const maybe = payload as { data?: T };
  return maybe?.data as T;
}

export async function fetchOutlets() {
  const response = await apiClient.get<{ data: RestaurantOutlet[] }>('/restaurant/outlets');
  if (response.error) throw new Error(response.error.message);
  return unwrapData<RestaurantOutlet[]>(response.data) ?? [];
}

export async function updateOutlet(outletId: string, payload: Partial<RestaurantOutlet>) {
  const response = await apiClient.patch<{ data: RestaurantOutlet }>(`/restaurant/outlets/${outletId}`, payload);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<RestaurantOutlet>(response.data);
}

export async function fetchMyPreferences() {
  const response = await apiClient.get<{ data: UserPreferenceResponse }>('/restaurant/preferences/me');
  if (response.error) throw new Error(response.error.message);
  return unwrapData<UserPreferenceResponse>(response.data);
}

export async function updateMyPreferences(payload: {
  preferred_language?: string | null;
  default_outlet_id?: string | null;
}) {
  const response = await apiClient.patch<{ data: UserPreferenceResponse }>('/restaurant/preferences/me', payload);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<UserPreferenceResponse>(response.data);
}

export async function closeDay(payload: {
  outlet_id: string;
  business_date: string;
  actual_cash: number;
  actual_card: number;
  actual_upi: number;
  actual_aggregator: number;
  lock_reason?: string | null;
}) {
  const response = await apiClient.post<{ data: DayEndClosure }>('/restaurant/day-end/close', payload);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<DayEndClosure>(response.data);
}

export async function listDayEnd(params?: {
  outlet_id?: string;
  from?: string;
  to?: string;
  status?: 'OPEN' | 'CLOSED' | 'LOCKED';
}) {
  const query = new URLSearchParams();
  if (params?.outlet_id) query.set('outlet_id', params.outlet_id);
  if (params?.from) query.set('from', params.from);
  if (params?.to) query.set('to', params.to);
  if (params?.status) query.set('status', params.status);

  const response = await apiClient.get<{ data: DayEndClosure[] }>(
    `/restaurant/day-end${query.toString() ? `?${query.toString()}` : ''}`
  );
  if (response.error) throw new Error(response.error.message);
  return unwrapData<DayEndClosure[]>(response.data) ?? [];
}

export async function unlockDay(dayEndId: string, reason: string) {
  const response = await apiClient.post<{ data: DayEndClosure }>(`/restaurant/day-end/${dayEndId}/unlock`, { reason });
  if (response.error) throw new Error(response.error.message);
  return unwrapData<DayEndClosure>(response.data);
}

export async function createExportJob(payload: {
  dataset: string;
  format: 'CSV' | 'XLSX';
  outlet_id?: string | null;
  filters?: Record<string, unknown>;
  selected_columns?: string[];
}) {
  const response = await apiClient.post<{ data: ExportJob }>('/restaurant/exports/jobs', payload);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<ExportJob>(response.data);
}

export async function listExportJobs() {
  const response = await apiClient.get<{ data: ExportJob[] }>('/restaurant/exports/jobs');
  if (response.error) throw new Error(response.error.message);
  return unwrapData<ExportJob[]>(response.data) ?? [];
}

export function exportDownloadUrl(jobId: string) {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  return `${baseUrl}/restaurant/exports/jobs/${jobId}/download`;
}

function getAuthHeaders() {
  const headers: Record<string, string> = {};
  const staffToken = localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
  if (staffToken) {
    headers.Authorization = `Bearer ${staffToken}`;
  }
  const restaurantData = localStorage.getItem('staff_restaurant') || localStorage.getItem('waiter_restaurant');
  if (restaurantData) {
    try {
      const parsed = JSON.parse(restaurantData) as { id?: string };
      if (parsed?.id) {
        headers['x-restaurant-id'] = parsed.id;
      }
    } catch {
      // ignore parse errors
    }
  }
  return headers;
}

export async function downloadExportJob(jobId: string, fallbackName = `export_${jobId}.csv`) {
  const response = await fetch(exportDownloadUrl(jobId), {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function validateOrderGst(orderId: string, payload?: {
  buyer_name?: string | null;
  buyer_gstin?: string | null;
  buyer_state_code?: string | null;
}) {
  const response = await apiClient.post<{ data: { invoice: GstInvoice; validation: unknown } }>(
    `/restaurant/invoices/${orderId}/validate-gst`,
    payload ?? {}
  );
  if (response.error) throw new Error(response.error.message);
  return unwrapData<{ invoice: GstInvoice; validation: unknown }>(response.data);
}

export async function fetchOrderInvoice(orderId: string) {
  const response = await apiClient.get<{ data: GstInvoice }>(`/restaurant/invoices/${orderId}`);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<GstInvoice>(response.data);
}

export async function generateOrderEInvoice(orderId: string, provider?: 'mock' | 'sandbox_hook') {
  const response = await apiClient.post<{ data: GstInvoice }>(`/restaurant/invoices/${orderId}/einvoice/generate`, {
    provider,
  });
  if (response.error) throw new Error(response.error.message);
  return unwrapData<GstInvoice>(response.data);
}

export async function validateVoucherCode(code: string, orderAmount: number) {
  const response = await apiClient.post<{ data: { voucher_id: string; code: string; discount_amount: number; description: string | null } }>(
    '/restaurant/vouchers/validate',
    { code, order_amount: orderAmount }
  );
  if (response.error) throw new Error(response.error.message);
  return unwrapData<{ voucher_id: string; code: string; discount_amount: number; description: string | null }>(response.data);
}

// ── Modifier Groups ─────────────────────────────────────────────────────────

export async function fetchProductModifiers(productId: string): Promise<ProductModifierGroup[]> {
  const response = await apiClient.get<{ data: ProductModifierGroup[] }>(`/restaurant/products/${productId}/modifiers`);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<ProductModifierGroup[]>(response.data) ?? [];
}

export async function createModifierGroup(
  productId: string,
  data: { name: string; is_required: boolean; min_select: number; max_select: number; sort_order?: number; options?: { name: string; price_delta: number; is_default?: boolean }[] }
): Promise<ProductModifierGroup> {
  const response = await apiClient.post<{ data: ProductModifierGroup }>(`/restaurant/products/${productId}/modifiers`, data);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<ProductModifierGroup>(response.data);
}

export async function updateModifierGroup(
  productId: string,
  groupId: string,
  data: { name?: string; is_required?: boolean; min_select?: number; max_select?: number; sort_order?: number }
): Promise<ProductModifierGroup> {
  const response = await apiClient.patch<{ data: ProductModifierGroup }>(`/restaurant/products/${productId}/modifiers/${groupId}`, data);
  if (response.error) throw new Error(response.error.message);
  return unwrapData<ProductModifierGroup>(response.data);
}

export async function deleteModifierGroup(productId: string, groupId: string): Promise<void> {
  const response = await apiClient.delete(`/restaurant/products/${productId}/modifiers/${groupId}`);
  if (response.error) throw new Error(response.error.message);
}

export async function addModifierOption(
  productId: string,
  groupId: string,
  data: { name: string; price_delta: number; is_default?: boolean; sort_order?: number }
) {
  const response = await apiClient.post(`/restaurant/products/${productId}/modifiers/${groupId}/options`, data);
  if (response.error) throw new Error(response.error.message);
  return (response.data as any)?.data;
}

export async function updateModifierOption(
  productId: string,
  groupId: string,
  optionId: string,
  data: { name?: string; price_delta?: number; is_default?: boolean; is_active?: boolean; sort_order?: number }
) {
  const response = await apiClient.patch(`/restaurant/products/${productId}/modifiers/${groupId}/options/${optionId}`, data);
  if (response.error) throw new Error(response.error.message);
  return (response.data as any)?.data;
}

export async function deleteModifierOption(productId: string, groupId: string, optionId: string): Promise<void> {
  const response = await apiClient.delete(`/restaurant/products/${productId}/modifiers/${groupId}/options/${optionId}`);
  if (response.error) throw new Error(response.error.message);
}
