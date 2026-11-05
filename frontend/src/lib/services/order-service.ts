import apiClient from "../api-client";
import { Product } from "./product-service";

export interface OrderItem {
  id: number;
  product: Product;
  price: string;
  quantity: number;
  get_cost: string;
  status: string;
}

export interface Order {
  id: number;
  customer: string;
  first_name: string;
  last_name: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
  total_amount: string;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
  items: OrderItem[];
}

export const orderService = {
  getOrder: async (orderId: number) => {
    const response = await apiClient.get<Order>(`/cart/orders/${orderId}/`);
    return response.data;
  },

  getOrders: async () => {
    const response = await apiClient.get<Order[]>("/cart/orders/");
    return response.data;
  },

  getAdminOrders: async () => {
    const response = await apiClient.get<Order[]>("/cart/admin/orders/");
    return response.data;
  },

  createOrder: async (data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    postal_code: string;
    city: string;
    payment_method: "ecocash" | "onemoney" | "cod";
  }) => {
    const response = await apiClient.post<Order>("/cart/orders/create/", data);
    return response.data;
  },

  getFarmerOrders: async () => {
    const response = await apiClient.get<OrderItem[]>("/cart/farmer/items/");
    return response.data;
  },

  updateOrderItemStatus: async (itemId: number, status: string) => {
    const response = await apiClient.patch<OrderItem>(`/cart/farmer/items/${itemId}/status/`, { status });
    return response.data;
  }
};
