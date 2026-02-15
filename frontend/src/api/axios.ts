/**
 * Phase 0 - Axios Instance with Interceptors
 * 
 * Centralized Axios configuration with:
 * - Base URL and timeout
 * - Request interceptor: inject access token
 * - Response interceptor: normalize errors, handle 401 refresh
 * 
 * This is the low-level HTTP client used by api/client.ts.
 * Components/stores should never import this directly.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from '@/utils/token';
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
 * Used to queue requests that arrive during refresh.
 */
let refreshPromise: Promise<string> | null = null;

/**
 * Creates and configures the Axios instance.
 */
function createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: inject access token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
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
            const newToken = await refreshPromise;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          }

          // Start token refresh
          isRefreshing = true;
          refreshPromise = refreshAccessToken();

          const newToken = await refreshPromise;
          
          // Update authorization header and retry original request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          // Token refresh failed - clear tokens and redirect to login
          clearTokens();
          
          // Dispatch custom event for auth failure (caught by auth store/context)
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
 * Refreshes the access token using the refresh token.
 * 
 * @returns New access token
 * @throws Error if refresh fails
 */
async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Create a separate axios instance to avoid interceptor recursion
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: REQUEST_TIMEOUT,
      }
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data;

    if (!accessToken) {
      throw new Error('No access token in refresh response');
    }

    // Update stored tokens
    setAccessToken(accessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }

    return accessToken;
  } catch (error) {
    // Clear tokens on refresh failure
    clearTokens();
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
