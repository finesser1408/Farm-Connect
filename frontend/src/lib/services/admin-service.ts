import apiClient from "../api-client";
import type { AdminRole, User } from "../auth-context";

export interface AdminUser extends User {
  is_superuser: boolean;
  is_active: boolean;
  is_verified: boolean;
  admin_role: AdminRole;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AdminUserQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: "super_admin" | "general_admin" | "farmer" | "customer";
  status?: "active" | "suspended";
}

export type AssignableUserRole = "general_admin" | "customer" | "farmer";

export type FarmerStatus = "pending" | "approved" | "suspended";

export interface AdminFarmer {
  id: number;
  user_id: number;
  profile_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  username: string;
  is_active: boolean;
  farm_name: string;
  location: string;
  description: string;
  status: FarmerStatus;
  status_reason: string;
  status_updated_at: string | null;
  product_count: number;
  created_at: string;
}

export interface AdminFarmerQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: FarmerStatus;
}

export interface AdminFarmerCreateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirm: string;
  farm_name: string;
  location: string;
  description?: string;
}

export const adminService = {
  getUsers: async (params?: AdminUserQueryParams) => {
    const queryParams = { page: 1, page_size: 12, ...params };
    const response = await apiClient.get<PaginatedResponse<AdminUser> | AdminUser[]>(
      "/auth/admin/users/",
      { params: queryParams },
    );
    const data = response.data;
    if (Array.isArray(data)) {
      return {
        count: data.length,
        next: null,
        previous: null,
        results: data,
      } satisfies PaginatedResponse<AdminUser>;
    }
    return data;
  },

  updateUserRole: async (userId: number, role: AssignableUserRole, reason?: string) => {
    const response = await apiClient.patch<AdminUser>(`/auth/admin/users/${userId}/role/`, {
      role,
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  updateUserStatus: async (userId: number, isActive: boolean, reason?: string) => {
    const response = await apiClient.patch<AdminUser>(`/auth/admin/users/${userId}/status/`, {
      is_active: isActive,
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  getFarmers: async (params?: AdminFarmerQueryParams) => {
    const queryParams = { page: 1, page_size: 12, ...params };
    const response = await apiClient.get<PaginatedResponse<AdminFarmer>>(
      "/auth/admin/farmers/",
      { params: queryParams },
    );
    return response.data;
  },

  createFarmer: async (data: AdminFarmerCreateInput) => {
    const response = await apiClient.post<AdminFarmer>("/auth/admin/farmers/", data);
    return response.data;
  },

  approveFarmer: async (farmerUserId: number, reason?: string) => {
    const response = await apiClient.patch<AdminFarmer>(
      `/auth/admin/farmers/${farmerUserId}/approve/`,
      { reason: reason?.trim() || "" },
    );
    return response.data;
  },

  suspendFarmer: async (farmerUserId: number, reason?: string) => {
    const response = await apiClient.patch<AdminFarmer>(
      `/auth/admin/farmers/${farmerUserId}/suspend/`,
      { reason: reason?.trim() || "" },
    );
    return response.data;
  },

  reactivateFarmer: async (farmerUserId: number, reason?: string) => {
    const response = await apiClient.patch<AdminFarmer>(
      `/auth/admin/farmers/${farmerUserId}/reactivate/`,
      { reason: reason?.trim() || "" },
    );
    return response.data;
  },
};
