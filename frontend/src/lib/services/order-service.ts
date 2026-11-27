import apiClient from "../api-client";
import { formatQuantityNumber } from "../product-units";
import { Product } from "./product-service";

export interface OrderItem {
  id: number;
  product: Product;
  product_name?: string;
  unit_label?: string;
  price: string;
  quantity: number;
  get_cost: string;
  status: string;
  order_status?: string;
  stock_restored?: boolean;
  stock_restored_at?: string | null;
}

export function isSimulatedOrderPayment(order: Pick<Order, "payment_method">): boolean {
  return Boolean(order.payment_method && /simulated/i.test(order.payment_method));
}

export function formatCustomerOrderStatus(
  order: Pick<Order, "status" | "payment_method">,
): string {
  const normalized = (order.status || "").toLowerCase();
  if (normalized === "paid" && isSimulatedOrderPayment(order)) {
    return "Paid (Simulated)";
  }
  return order.status;
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

export function getOrderItemProductName(item: OrderItem): string {
  const snap = (item.product_name || "").trim();
  if (snap) return snap;
  return item.product?.name || "Product";
}

export function getOrderItemUnitLabel(item: OrderItem): string {
  // Never fabricate a unit from live product edits if the historical snapshot is empty
  return (item.unit_label || "").trim();
}

export function formatOrderItemQuantityWithUnit(item: OrderItem): string {
  const qtyText = formatQuantityNumber(item.quantity);
  const unitLabel = getOrderItemUnitLabel(item);
  return unitLabel ? `${qtyText} ${unitLabel}` : qtyText;
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
    const response = await apiClient.patch<OrderItem>(
      `/cart/farmer/items/${itemId}/status/`,
      { status },
    );
    return response.data;
  },
};
