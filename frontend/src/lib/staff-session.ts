import { apiClient } from "@/lib/api-client";

type StaffLoginResponse = {
  token?: string;
  accessToken?: string;
  staff?: unknown;
  restaurant?: {
    id?: string;
    tenantId?: string;
  };
};

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

export function saveStaffSession(data: StaffLoginResponse) {
  const token = data.token || data.accessToken || "";
  clearStaffSessionStorage();

  localStorage.setItem("staff_token", token);
  localStorage.setItem("staff_data", JSON.stringify(data.staff || {}));
  localStorage.setItem("staff_restaurant", JSON.stringify(data.restaurant || {}));
}

export async function logoutStaffSession() {
  const token = localStorage.getItem("staff_token") || localStorage.getItem("waiter_token");

  try {
    await fetch(authUrl("/auth/staff/logout"), {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
