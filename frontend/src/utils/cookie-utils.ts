/**
 * Cookie Utility Functions
 * Helper functions to read cookies set by the backend
 */

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Delete a cookie by name (client-side only, for non-httpOnly cookies)
 */
export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Get restaurant ID from cookie
 */
export function getRestaurantIdFromCookie(): string | null {
  return getCookie('rbs_restaurant');
}

/**
 * Get tenant ID from cookie
 */
export function getTenantIdFromCookie(): string | null {
  return getCookie('rbs_tenant');
}

/**
 * Check if user has authentication cookies
 */
export function hasAuthCookies(): boolean {
  // We can't read httpOnly cookies, but we can check the non-httpOnly context cookies
  return !!(getRestaurantIdFromCookie() || getTenantIdFromCookie());
}
