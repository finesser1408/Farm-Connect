import apiClient from "../api-client";

export interface Product {
  id: number;
  farmer_email: string;
  farmer_name: string;
  category: number | null;
  category_details: Category | null;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  image: string | null;
  is_available: boolean;
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

export const productService = {
  getProducts: async (params?: any) => {
    // Django can return either a raw list or a paginated object depending on setup.
    // We use any here and handle the branching in the component, or define a union.
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
};
