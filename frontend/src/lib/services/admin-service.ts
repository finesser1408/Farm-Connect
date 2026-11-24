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

export type ModerationStatus = "pending" | "approved" | "rejected";
export type ModerationDecision = "approved" | "rejected";

interface AdminModerationBase {
  id: number;
  customer_id: number;
  customer_email: string;
  customer_name: string;
  rating: number;
  comment: string;
  status: ModerationStatus;
  moderated_by: number | null;
  moderated_by_email: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProductReview extends AdminModerationBase {
  product: number;
  product_name: string;
  product_slug: string;
  title: string;
  verified_purchase: boolean;
}

export interface AdminPlatformTestimonial extends AdminModerationBase {
  effective_display_name: string;
  display_name: string;
  role_or_title: string;
  consent_public: boolean;
  is_verified_buyer: boolean;
}

export interface AdminModerationQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: ModerationStatus;
}

export interface AdminMonthlyOrderActivity {
  month: string;
  month_key: string;
  orders: number;
}

export interface AdminDashboardStats {
  total_users: number;
  total_farmers: number;
  total_products: number;
  total_orders: number;
  verified_payments_enabled: boolean;
  verified_sales_total: string | null;
  monthly_activity: AdminMonthlyOrderActivity[];
}

async function getPaginatedModerationList<T>(url: string, params?: AdminModerationQueryParams) {
  const queryParams = { page: 1, page_size: 12, ...params };
  const response = await apiClient.get<PaginatedResponse<T> | T[]>(url, { params: queryParams });
  const data = response.data;
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data } satisfies PaginatedResponse<T>;
  }
  return data;
}

export const adminService = {
  getDashboardStats: async () => {
    const response = await apiClient.get<AdminDashboardStats>("/auth/admin/stats/");
    return response.data;
  },

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

  getProductReviews: (params?: AdminModerationQueryParams) =>
    getPaginatedModerationList<AdminProductReview>("/reviews/admin/products/", params),

  moderateProductReview: async (reviewId: number, status: ModerationDecision, reason?: string) => {
    const response = await apiClient.patch<AdminProductReview>(`/reviews/admin/products/${reviewId}/`, {
      status,
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  getTestimonials: (params?: AdminModerationQueryParams) =>
    getPaginatedModerationList<AdminPlatformTestimonial>("/reviews/admin/testimonials/", params),

  moderateTestimonial: async (testimonialId: number, status: ModerationDecision, reason?: string) => {
    const response = await apiClient.patch<AdminPlatformTestimonial>(
      `/reviews/admin/testimonials/${testimonialId}/`,
      { status, reason: reason?.trim() || "" },
    );
    return response.data;
  },
};
