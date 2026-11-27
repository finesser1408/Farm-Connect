import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingCart, DollarSign, Clock, Loader2 } from "lucide-react";
import { roundCurrencyCents } from "@/lib/product-units";
import { productService } from "@/lib/services/product-service";
import {
  formatOrderItemQuantityWithUnit,
  getOrderItemProductName,
  orderService,
} from "@/lib/services/order-service";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};

export default function FarmerDashboard() {
  const productsQuery = useQuery({
    queryKey: ["products", "farmer", "me"],
    queryFn: () => productService.getProducts({ farmer: "me", page_size: 100 }),
  });

  const ordersQuery = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: () => orderService.getFarmerOrders(),
  });

  const productsData = productsQuery.data;
  const products = productsData ? (Array.isArray(productsData) ? productsData : productsData.results) : [];
  const productCount = productsData && !Array.isArray(productsData) ? productsData.count : products.length;
  const activeCount = products.filter((p) => (p.moderation_status || "active") === "active").length;
  const availableCount = products.filter(
    (p) =>
      (p.moderation_status || "active") === "active" &&
      p.is_available !== false &&
      Number(p.stock) > 0,
  ).length;
  const orders = ordersQuery.data ?? [];
  const pendingCount = orders.filter(
    (o) => o.status === "pending" && o.order_status !== "cancelled",
  ).length;
  const acceptedOrderValue = roundCurrencyCents(
    orders
      .filter(
        (o) =>
          o.order_status !== "cancelled" &&
          (o.status === "accepted" || o.status === "shipped" || o.status === "delivered"),
      )
      .reduce((sum, o) => sum + (Number(o.get_cost) || 0), 0),
  );
  const recentOrders = orders.slice(0, 5);
  const isLoading = productsQuery.isLoading || ordersQuery.isLoading;

  const stats = [
    {
      label: "Products Listed",
      value: String(productCount),
      subtitle: `${activeCount} active · ${availableCount} available`,
      icon: Package,
    },
    { label: "Order Items", value: String(orders.length), icon: ShoppingCart },
    { label: "Pending Orders", value: String(pendingCount), icon: Clock },
    {
      label: "Accepted Order Value",
      value: `$${acceptedOrderValue.toFixed(2)}`,
      subtitle: "Simulated / COD · Excl. pending, rejected & cancelled",
      icon: DollarSign,
    },
  ];

  return (
    <div className="min-w-0">
      <h1 className="mb-6 font-display text-2xl text-foreground">Farm Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-muted-foreground sm:text-sm">{stat.label}</span>
              <stat.icon className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-2 truncate text-xl font-semibold text-foreground sm:text-2xl">
              {isLoading ? "—" : stat.value}
            </p>
            {!isLoading && stat.subtitle && (
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
          <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
          {orders.length > 0 && (
            <Link to="/farmer/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : ordersQuery.isError ? (
          <p className="px-4 py-8 text-center text-sm text-destructive sm:px-6" role="alert">
            Could not load recent orders.
          </p>
        ) : recentOrders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
            No orders yet. They will appear here when customers buy your products.
          </p>
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="divide-y divide-border md:hidden">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {getOrderItemProductName(o)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{o.id} · Qty {formatOrderItemQuantityWithUnit(o)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-foreground">${o.get_cost}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[o.status] ?? "bg-muted text-muted-foreground"}`}>
                      {o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Tablet/desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-6 py-3">Order</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3">Qty</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-6 py-3 font-medium text-foreground">#{o.id}</td>
                      <td className="px-6 py-3 text-foreground">{getOrderItemProductName(o)}</td>
                      <td className="px-6 py-3">{formatOrderItemQuantityWithUnit(o)}</td>
                      <td className="px-6 py-3 capitalize">{o.status}</td>
                      <td className="px-6 py-3 text-right font-medium">${o.get_cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
