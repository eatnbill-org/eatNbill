export type UiLanguageCode = 'en' | 'hi' | 'gu' | 'mr' | 'fr' | 'de';
export type BackendLanguageCode = 'EN' | 'HI' | 'GU' | 'MR' | 'FR' | 'DE';

export type ReceiptTemplate = 'MM80_STANDARD' | 'MM58_COMPACT' | 'A4_TAX_INVOICE';
export type TaxPricingMode = 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE';

export type RestaurantOutlet = {
  id: string;
  tenant_id: string;
  restaurant_id: string;
  name: string;
  code: string | null;
  address: string | null;
  gstin: string | null;
  state_code: string | null;
  timezone: string;
  default_language: BackendLanguageCode;
  receipt_template: ReceiptTemplate;
  variance_lock_amount: string;
  variance_lock_percent: string;
  tax_pricing_mode: TaxPricingMode;
  is_einvoice_enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type UserPreferenceResponse = {
  preferred_language: BackendLanguageCode | null;
  default_outlet_id: string | null;
  effective_language: BackendLanguageCode;
  effective_outlet_id: string | null;
};

export type DayEndStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export type DayEndClosure = {
  id: string;
  outlet_id: string;
  business_date: string;
  expected_cash: string;
  expected_card: string;
  expected_upi: string;
  expected_aggregator: string;
  actual_cash: string;
  actual_card: string;
  actual_upi: string;
  actual_aggregator: string;
  variance_cash: string;
  variance_card: string;
  variance_upi: string;
  variance_aggregator: string;
  expected_total: string;
  actual_total: string;
  variance_total: string;
  variance_percent: string;
  status: DayEndStatus;
  lock_reason: string | null;
  closed_at: string | null;
  locked_at: string | null;
  unlocked_at: string | null;
  outlet?: RestaurantOutlet;
};

export type ExportDataset =
  | 'ORDERS'
  | 'SALES'
  | 'USERS'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'RESERVATIONS'
  | 'DAY_END'
  | 'GST_INVOICES'
  | 'TAX_SUMMARY'
  | 'GSTR1_SUMMARY'
  | 'GSTR3B_SUMMARY'
  | 'WAITER_PERFORMANCE'
  | 'AGGREGATOR_COMMISSION'
  | 'PAYROLL';

export type ExportFormat = 'CSV' | 'XLSX';
export type ExportJobStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';

export type ExportFile = {
  id: string;
  export_job_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
};

export type ExportJob = {
  id: string;
  dataset: ExportDataset;
  format: ExportFormat;
  status: ExportJobStatus;
  attempts: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  outlet_id: string | null;
  outlet?: RestaurantOutlet | null;
  selected_columns: string[];
  files: ExportFile[];
};

export type GInvoiceLine = {
  id: string;
  product_name: string;
  hsn_sac: string | null;
  quantity: number;
  unit_price: string;
  taxable_amount: string;
  gst_rate_percent: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_tax_amount: string;
  line_total_amount: string;
};

export type GstInvoice = {
  id: string;
  order_id: string;
  invoice_number: string;
  invoice_type: 'B2B' | 'B2C';
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  irn_status: 'NOT_APPLICABLE' | 'READY' | 'SUBMITTED' | 'SUCCESS' | 'FAILED';
  buyer_name: string | null;
  buyer_gstin: string | null;
  buyer_state_code: string | null;
  seller_gstin: string | null;
  seller_state_code: string | null;
  taxable_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  total_tax_amount: string;
  grand_total_amount: string;
  einvoice_provider: string | null;
  irn: string | null;
  ack_no: string | null;
  ack_date: string | null;
  signed_qr_payload: string | null;
  einvoice_error: Record<string, unknown> | null;
  lines: GInvoiceLine[];
};
