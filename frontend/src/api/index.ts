/**
 * Phase 0 - API Layer Exports
 * 
 * Centralized exports for API infrastructure.
 * Import from '@/api' instead of individual files.
 */

// API Client
export { api, isApiError } from './client';
export type { ApiResponse, ApiRequestConfig } from './client';

// Error Handling
export { normalizeError, isErrorStatus, isErrorCode, isNetworkError } from './error';
export type { ApiError } from './error';

// Axios Instance (for advanced use cases only)
export { axiosInstance, API_BASE_URL } from './axios';
