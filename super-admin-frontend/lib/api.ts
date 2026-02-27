import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Use relative URL to let Next.js proxy handle the request
// This prevents path duplication in the rewrite rule
const API_URL = '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/super-admin`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies
    });

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async refreshToken() {
    const response = await this.client.post('/auth/refresh');
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async getDashboardOverview() {
    const response = await this.client.get('/dashboard/overview');
    return response.data;
  }

  async listTenants(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const response = await this.client.get('/tenants', { params });
    return response.data;
  }

  async getTenant(tenantId: string) {
    const response = await this.client.get(`/tenants/${tenantId}`);
    return response.data;
  }

  async createTenant(data: { name: string; plan: string }) {
    const response = await this.client.post('/tenants', data);
    return response.data;
  }

  async updateTenant(tenantId: string, data: { name?: string; plan?: string; status?: string; notes?: string }) {
    const response = await this.client.patch(`/tenants/${tenantId}`, data);
    return response.data;
  }

  async suspendTenant(tenantId: string, reason?: string) {
    const response = await this.client.post(`/tenants/${tenantId}/suspend`, { reason });
    return response.data;
  }

  async activateTenant(tenantId: string) {
    const response = await this.client.post(`/tenants/${tenantId}/activate`);
    return response.data;
  }

  async listRestaurants(params?: { page?: number; limit?: number; tenantId?: string; search?: string }) {
    const response = await this.client.get('/restaurants', { params });
    return response.data;
  }

  async getRestaurant(restaurantId: string) {
    const response = await this.client.get(`/restaurants/${restaurantId}`);
    return response.data;
  }

  async listUsers(params?: { page?: number; limit?: number; tenantId?: string; role?: string; search?: string }) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async getUserActivity(userId: string, params?: { days?: number; page?: number; limit?: number }) {
    const response = await this.client.get(`/users/${userId}/activity`, { params });
    return response.data;
  }

  async listAuditLogs(params?: { 
    page?: number; 
    limit?: number; 
    tenantId?: string; 
    adminId?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await this.client.get('/audit-logs', { params });
    return response.data;
  }

  async getSystemHealth() {
    const response = await this.client.get('/system/health');
    return response.data;
  }
}

export const apiClient = new ApiClient();
