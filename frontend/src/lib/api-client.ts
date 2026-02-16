/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Client for Backend Communication
 * Handles authentication via HTTP-only cookies, token refresh, and error handling
 */

import { getRestaurantIdFromCookie, getTenantIdFromCookie } from '@/utils/cookie-utils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface ApiError {
  code: string;
  message: string;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

class ApiClient {
  private baseURL: string;
  private restaurantId: string | null = null;
  private tenantId: string | null = null;
  private refreshing: boolean = false;
  private refreshPromise: Promise<void> | null = null;
  private authFailed: boolean = false; // Prevent requests after auth failure

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load restaurant and tenant ID from cookies on initialization
    this.restaurantId = getRestaurantIdFromCookie() || getStaffRestaurantId();
    this.tenantId = getTenantIdFromCookie();

    // Debug: Log restaurant ID on initialization
    if (this.restaurantId) {
      console.log('[API Client] Initialized with restaurant ID:', this.restaurantId);
    } else {
      console.warn('[API Client] No restaurant ID found in cookies');
    }
  }

  /**
   * Set the restaurant ID (updates local state from cookie)
   */
  setRestaurantId(restaurantId: string | null) {
    console.log('[API Client] Setting restaurant ID:', restaurantId);
    this.restaurantId = restaurantId;
    // Note: Cookie is set by backend, this just updates local state
  }

  setTenantId(tenantId: string | null) {
    console.log('[API Client] Setting tenant ID:', tenantId);
    this.tenantId = tenantId;
    // Note: Cookie is set by backend, this just updates local state
  }

  /**
   * Get the current restaurant ID (reads from cookie if not cached)
   */
  getRestaurantId(): string | null {
    return this.restaurantId || getRestaurantIdFromCookie() || getStaffRestaurantId();
  }

  getTenantId(): string | null {
    return this.tenantId || getTenantIdFromCookie();
  }

  /**
   * Check if endpoint is public (no auth required)
   */
  private isPublicEndpoint(endpoint: string): boolean {
    return endpoint.startsWith('/public/');
  }

  /**
   * Check if endpoint should skip restaurant ID header
   * (for endpoints that work without restaurant context)
   */
  private shouldSkipRestaurantId(endpoint: string): boolean {
    // Only skip restaurant ID for:
    // - Public endpoints (no auth at all)
    // - Auth endpoints (no restaurant context yet)
    // - Restaurant setup (creating first restaurant)
    // - Restaurant profile/list (should fetch at tenant level to determine restaurant)
    return (
      endpoint.startsWith('/public/') ||
      endpoint.startsWith('/auth/') ||
      endpoint === '/restaurant/setup'
    );
  }

  /**
   * Refresh the access token using the refresh token cookie
   * Backend will automatically read the httpOnly cookie
   */
  private async refreshAccessToken(): Promise<void> {
    if (this.refreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Send httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        // Backend will set new cookies automatically
        const data = await response.json();

        // Update local restaurant ID if provided
        if (data.user?.allowed_restaurant_ids?.[0]) {
          this.restaurantId = data.user.allowed_restaurant_ids[0];
        }
        if (data.user?.tenantId) {
          this.tenantId = data.user.tenantId;
        }
      } catch (error) {
        // Clear auth and redirect to login
        this.authFailed = true; // Mark auth as failed
        this.clearAuth();

        // Use setTimeout to ensure this happens after current call stack
        setTimeout(() => {
          if (window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }, 100);

        throw error;
      } finally {
        this.refreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make an authenticated API request using HTTP-only cookies
   */
  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // If auth has failed, don't make any more requests
    const authRecoveryEndpoint =
      endpoint.startsWith('/auth/login') ||
      endpoint.startsWith('/auth/register') ||
      endpoint.startsWith('/auth/forgot-password') ||
      endpoint.startsWith('/auth/verify-register-otp') ||
      endpoint.startsWith('/auth/verify-forgot-password-otp') ||
      endpoint.startsWith('/auth/resend-otp') ||
      endpoint.startsWith('/auth/resend-register-otp') ||
      endpoint.startsWith('/auth/reset-password');

    if (this.authFailed && !authRecoveryEndpoint) {
      return {
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed. Redirecting to login...'
        }
      };
    }

    const url = `${this.baseURL}${endpoint}`;
    const isPublic = this.isPublicEndpoint(endpoint);

    // Prepare headers
    const headers: any = {
      ...options.headers,
    };

    // Only set JSON content type if not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    } else {
      // Browser sets Boundary for FormData automatically
      delete headers['Content-Type'];
    }

    // Add restaurant ID header if set (skip for specific endpoints)
    const currentRestaurantId = this.getRestaurantId();
    if (currentRestaurantId && !this.shouldSkipRestaurantId(endpoint)) {
      headers['x-restaurant-id'] = currentRestaurantId;
    } else if (!this.shouldSkipRestaurantId(endpoint) && !isPublic) {
      // Warn if we should send restaurant ID but don't have one
      console.warn('[API Client] Missing restaurant ID for endpoint:', endpoint);
    }

    // Attach staff bearer token if present (manager/staff sessions)
    const staffToken = getStaffToken();
    if (staffToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${staffToken}`;
    }

    // Make the request with credentials to include cookies
    const requestOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // CRITICAL: Include httpOnly cookies
    };

    try {
      let response = await fetch(url, requestOptions);

      // If 401 Unauthorized, try to refresh token and retry (only for authenticated endpoints)
      // Don't try to refresh for /auth/me - if it fails, user is just not logged in
      if (response.status === 401 &&
        !isPublic &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/me')) {
        try {
          await this.refreshAccessToken();

          // Retry the request with new token (in cookie)
          response = await fetch(url, requestOptions);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          return { error: { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' } };
        }
      }

      // Parse response safely - handle 204 No Content or empty bodies
      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (response.status !== 204 && contentType && contentType.includes('application/json')) {
        data = await response.json();
      }

      if (!response.ok) {
        return { error: data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' } };
      }

      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return {
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Clear authentication state
   */
  clearAuth() {
    this.restaurantId = null;
    this.tenantId = null;
    this.authFailed = false; // Reset auth failed flag
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_data');
    localStorage.removeItem('staff_restaurant');
    localStorage.removeItem('waiter_token');
    localStorage.removeItem('waiter_data');
    localStorage.removeItem('waiter_restaurant');
    // Note: Cookies will be cleared by backend on logout
  }

  /**
   * Reset auth state after successful login
   */
  resetAuthState() {
    this.authFailed = false;
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL);

// Export types
export type { ApiError, ApiResponse };

function getStaffToken(): string | null {
  return localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
}

function getStaffRestaurantId(): string | null {
  const data = localStorage.getItem('staff_restaurant') || localStorage.getItem('waiter_restaurant');
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return parsed?.id || null;
  } catch {
    return null;
  }
}
