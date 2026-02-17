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
import { useLoadingStore, type LoadingScope } from '@/stores/ui/loading.store';

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
  loading?: {
    enabled?: boolean;
    scope?: LoadingScope;
    key?: string;
  };
}

class ApiClient {
  private async withTrackedLoading<T>(
    task: () => Promise<T>,
    method: string,
    url: string,
    config?: ApiRequestConfig
  ): Promise<T> {
    const loadingConfig = config?.loading;

    if (loadingConfig?.enabled === false) {
      return task();
    }

    const scope = loadingConfig?.scope ?? 'component';
    const key = loadingConfig?.key ?? `api:${method.toUpperCase()}:${url}`;

    const { startLoading, stopLoading } = useLoadingStore.getState();
    startLoading(key, scope);

    try {
      return await task();
    } finally {
      stopLoading(key, scope);
    }
  }

  private stripLoadingConfig(config?: ApiRequestConfig): AxiosRequestConfig | undefined {
    if (!config) return undefined;
    const { loading: _loading, ...axiosConfig } = config;
    return axiosConfig;
  }

  /**
   * Performs a GET request.
   * 
   * @param url - Endpoint path (e.g., '/products')
   * @param config - Optional request configuration
   * @returns Typed response data
   * @throws ApiError on failure
   */
  async get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.get(url, this.stripLoadingConfig(config));
      return this.normalizeResponse(response);
    }, 'get', url, config);
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
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.post(
        url,
        data,
        this.stripLoadingConfig(config)
      );
      return this.normalizeResponse(response);
    }, 'post', url, config);
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
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.put(
        url,
        data,
        this.stripLoadingConfig(config)
      );
      return this.normalizeResponse(response);
    }, 'put', url, config);
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
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.patch(
        url,
        data,
        this.stripLoadingConfig(config)
      );
      return this.normalizeResponse(response);
    }, 'patch', url, config);
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
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.delete(url, this.stripLoadingConfig(config));
      return this.normalizeResponse(response);
    }, 'delete', url, config);
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
    return this.withTrackedLoading(async () => {
      const response: AxiosResponse<T> = await axiosInstance.post(url, formData, {
        ...this.stripLoadingConfig(config),
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
      });
      return this.normalizeResponse(response);
    }, 'upload', url, config);
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
