/**
 * Phase 0 - API Client
 * 
 * High-level API client with typed methods for HTTP requests.
 * This is the ONLY way stores should communicate with the backend.
 * 
 * Features:
 * - Typed request/response
 * - Automatic error normalization via Axios interceptors
 * - Token injection via Axios interceptors
 * - Consistent response shape
 * 
 * Architecture:
 * Store → api.get/post/etc → axiosInstance → Backend
 * 
 * Usage in stores:
 * 
 * ```ts
 * import { api } from '@/api/client';
 * import { ApiError } from '@/api/error';
 * 
 * async function fetchProducts() {
 *   try {
 *     const response = await api.get<Product[]>('/products');
 *     return { success: true, data: response.data };
 *   } catch (error) {
 *     return { success: false, error: error as ApiError };
 *   }
 * }
 * ```
 */

import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { axiosInstance } from './axios';
import { ApiError } from './error';

/**
 * Standard API response wrapper.
 * All API methods return this shape (except raw methods).
 */
export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * API request options.
 * Extends Axios config with common overrides.
 */
export interface ApiRequestConfig extends Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> {
  /** Skip auth token injection (for public endpoints) */
  skipAuth?: boolean;
}

class ApiClient {
  /**
   * Performs a GET request.
   * 
   * @param url - Endpoint path (e.g., '/products')
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.get(url, config);
    return this.normalizeResponse(response);
  }

  /**
   * Performs a POST request.
   * 
   * @param url - Endpoint path (e.g., '/auth/login')
   * @param data - Request body
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.post(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Performs a PUT request.
   * 
   * @param url - Endpoint path (e.g., '/products/123')
   * @param data - Request body
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.put(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Performs a PATCH request.
   * 
   * @param url - Endpoint path (e.g., '/products/123')
   * @param data - Request body
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.patch(url, data, config);
    return this.normalizeResponse(response);
  }

  /**
   * Performs a DELETE request.
   * 
   * @param url - Endpoint path (e.g., '/products/123')
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.delete(url, config);
    return this.normalizeResponse(response);
  }

  /**
   * Normalizes Axios response into consistent shape.
   * 
   * @param response - Axios response object
   * @returns Normalized API response
   */
  private normalizeResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * Uploads a file with multipart/form-data.
   * 
   * @param url - Endpoint path (e.g., '/products/123/image')
   * @param formData - FormData object with file and other fields
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async upload<T = unknown>(
    url: string,
    formData: FormData,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const response: AxiosResponse<T> = await axiosInstance.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.normalizeResponse(response);
  }
}

/**
 * Singleton API client instance.
 * Import this in stores only (never in components).
 * 
 * @example
 * ```ts
 * import { api } from '@/api/client';
 * 
 * const response = await api.get<Product[]>('/products');
 * console.log(response.data);
 * ```
 */
export const api = new ApiClient();

/**
 * Type guard to check if an error is an ApiError.
 * 
 * @param error - Any error object
 * @returns true if error is ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}
