import { apiClient } from "@/lib/api-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

function authUrl(path: string): string {
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  return base.endsWith("/api/v1") ? `${base}${path}` : `${base}/api/v1${path}`;
}

export function clearStaffSessionStorage() {
  localStorage.removeItem("staff_token");
  localStorage.removeItem("staff_data");
  localStorage.removeItem("staff_restaurant");
  localStorage.removeItem("waiter_token");
  localStorage.removeItem("waiter_data");
  localStorage.removeItem("waiter_restaurant");
}

export async function logoutStaffSession() {
  try {
    await fetch(authUrl("/auth/staff/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort logout
  }

  try {
    await fetch(authUrl("/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best-effort logout
  }

  clearStaffSessionStorage();
  apiClient.clearAuth();
}
