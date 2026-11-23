import apiClient from "../api-client";

export type ProductModerationStatus = "active" | "hidden" | "removed";

export interface Product {
  id: number;
  farmer_id?: number;
  farmer_name: string;
  farmer_location: string;
  farmer_status?: string;
  category: number | null;
  category_details: Category | null;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  image: string | null;
  is_available: boolean;
  moderation_status?: ProductModerationStatus;
  moderation_reason?: string;
  moderated_at?: string | null;
  moderated_by?: number | null;
  moderated_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductQueryParams {
  available?: "all" | "true" | "false";
  category?: string;
  farmer?: string;
  farmer_id?: number;
  location?: string;
  max_price?: number;
  min_price?: number;
  moderation_status?: "all" | ProductModerationStatus;
  ordering?: "price" | "-price" | "created_at" | "-created_at" | "name" | "-name";
  page?: number;
  page_size?: number;
  price?: number;
  search?: string;
}

export interface ProductInput {
  farmer_id?: number;
  name: string;
  price: string;
  stock: number;
  description: string;
  category: number | null;
}

export const productService = {
  getProducts: async (params?: ProductQueryParams) => {
    // Django can return either a raw list or a paginated object depending on setup.
    const response = await apiClient.get<Product[] | PaginatedResponse<Product>>("/products/", { params });
    return response.data;
  },

  getProductBySlug: async (slug: string) => {
    const response = await apiClient.get<Product>(`/products/${slug}/`);
    return response.data;
  },

  getCategories: async () => {
    const response = await apiClient.get<Category[]>("/products/categories/");
    return response.data;
  },

  createProduct: async (data: FormData | ProductInput) => {
    const response = await apiClient.post<Product>("/products/", data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  },

  updateProduct: async (slug: string, data: FormData | Partial<ProductInput>) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/`, data, {
      headers: data instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  },

  hideProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/hide/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  restoreProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/restore/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  removeProduct: async (slug: string, reason?: string) => {
    const response = await apiClient.patch<Product>(`/products/${slug}/remove/`, {
      reason: reason?.trim() || "",
    });
    return response.data;
  },

  deleteProduct: async (slug: string) => {
    await apiClient.delete(`/products/${slug}/`);
  },
};
