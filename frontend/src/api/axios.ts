/**
 * Phase 0 - Axios Instance with Interceptors
 * 
 * Centralized Axios configuration with:
 * - Base URL and timeout
 * - Cookie-based auth with credentials included
 * - Response interceptor: normalize errors, handle 401 refresh
 * 
 * This is the low-level HTTP client used by api/client.ts.
 * Components/stores should never import this directly.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getCsrfTokenFromCookie } from '@/utils/cookie-utils';
import { normalizeError } from './error';

// Base API URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

/**
 * Flag to prevent multiple simultaneous token refresh requests.
 */
let isRefreshing = false;

/**
 * Promise that resolves when token refresh completes.
 */
let refreshPromise: Promise<void> | null = null;

/**
 * Creates and configures the Axios instance.
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const method = (config.method || 'get').toUpperCase();
      if (config.headers && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor: handle errors and token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Successful response, return as-is
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // If already refreshing, wait for that to complete
          if (isRefreshing && refreshPromise) {
            await refreshPromise;
            return instance(originalRequest);
          }

          // Start token refresh
          isRefreshing = true;
          refreshPromise = refreshAccessToken();

          await refreshPromise;
          return instance(originalRequest);
        } catch (refreshError) {
          window.dispatchEvent(new CustomEvent('auth:token-refresh-failed'));
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      }

      // For all other errors, normalize and reject
      return Promise.reject(normalizeError(error));
    }
  );

  return instance;
}

/**
 * Refreshes the access token using the refresh cookie.
 *
 * @throws Error if refresh fails
 */
async function refreshAccessToken(): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
        timeout: REQUEST_TIMEOUT,
      }
    );
  } catch (error) {
    throw normalizeError(error, 'Failed to refresh authentication');
  }
}

/**
 * Singleton Axios instance.
 * Import this in api/client.ts only.
 */
export const axiosInstance = createAxiosInstance();

/**
 * Export base URL for external use (e.g., file uploads).
 */
export { API_BASE_URL };
