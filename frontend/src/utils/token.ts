/**
 * Phase 0 - Token Management Utilities
 * 
 * Centralized token storage/retrieval using localStorage.
 * 
 * ⚠️ SECURITY NOTE (Phase 1 Migration):
 * localStorage is vulnerable to XSS attacks. This is a temporary solution.
 * Phase 1 will migrate to httpOnly cookies managed by the backend.
 * 
 * Current approach:
 * - Access token: short-lived JWT for API requests
 * - Refresh token: long-lived token for obtaining new access tokens
 * 
 * Phase 1 approach (httpOnly cookies):
 * - Backend sets httpOnly cookies on login
 * - Frontend makes requests with credentials: 'include'
 * - Backend handles token refresh automatically
 * - No token storage/reading on frontend
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Retrieves the access token from localStorage.
 * 
 * @returns Access token or null if not found
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read access token from localStorage:', error);
    return null;
  }
}

/**
 * Stores the access token in localStorage.
 * 
 * @param token - Access token to store (null to remove)
 */
export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to write access token to localStorage:', error);
  }
}

/**
 * Retrieves the refresh token from localStorage.
 * 
 * @returns Refresh token or null if not found
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read refresh token from localStorage:', error);
    return null;
  }
}

/**
 * Stores the refresh token in localStorage.
 * 
 * @param token - Refresh token to store (null to remove)
 */
export function setRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to write refresh token to localStorage:', error);
  }
}

/**
 * Removes all tokens from localStorage.
 * Called on logout or auth failure.
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens from localStorage:', error);
  }
}

/**
 * Checks if user has valid tokens (basic check, doesn't verify JWT signature or expiry).
 * 
 * @returns true if both tokens exist
 */
export function hasTokens(): boolean {
  return !!(getAccessToken() && getRefreshToken());
}
