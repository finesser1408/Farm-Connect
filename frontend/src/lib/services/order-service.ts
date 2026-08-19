import apiClient from "../api-client";
import { Product } from "./product-service";

export interface OrderItem {
  id: number;
  product: Product;
  price: string;
  quantity: number;
  get_cost: string;
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
  created_at: string;
  items: OrderItem[];
}

export const orderService = {
  getOrders: async () => {
    const response = await apiClient.get<Order[]>("/cart/orders/");
    return response.data;
  },

  createOrder: async (data: {
    first_name: string;
    last_name: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
  }) => {
    const response = await apiClient.post<Order>("/cart/orders/create/", data);
    return response.data;
  },

  getFarmerOrders: async () => {
    const response = await apiClient.get<OrderItem[]>("/cart/farmer/items/");
    return response.data;
  },

  updateOrderItemStatus: async (itemId: number, status: string) => {
    const response = await apiClient.patch(`/cart/farmer/items/${itemId}/status/`, { status });
    return response.data;
  }
};
