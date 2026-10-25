import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Loader2,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";
import { orderService, Order } from "@/lib/services/order-service";
import { productService, PaginatedResponse, Product } from "@/lib/services/product-service";
import type { User } from "@/lib/auth-context";
import { normalizeStatus, statusChipClass, statusLabel } from "@/lib/status";

type AdminUser = User;

const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "short" });

export default function AdminDashboard() {
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await apiClient.get<AdminUser[]>("/auth/admin/users/")).data,
  });

  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => orderService.getOrders(),
  });

  const { data: productsResponse, isLoading: isProductsLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => productService.getProducts(),
  });

  const products: Product[] = useMemo(() => {
    if (!productsResponse) return [];
    return Array.isArray(productsResponse)
      ? productsResponse
      : (productsResponse as PaginatedResponse<Product>).results;
  }, [productsResponse]);

  const farmers = users.filter((user) => user.user_type === "farmer");
  const customers = users.filter((user) => user.user_type === "customer");
  const unverified = users.filter((user) => !user.is_verified);

  const totalRevenue = orders
    .filter((order) => normalizeStatus(order.status) !== "cancelled")
    .reduce((sum, order) => sum + parseFloat(order.total_amount || "0"), 0);

  const activeOrders = orders.filter((order) =>
    ["pending", "processing", "accepted", "shipped", "paid"].includes(normalizeStatus(order.status)),
  ).length;

  const stats = [
    { label: "Total Users", value: users.length.toString(), icon: Users, hint: `${customers.length} customers`, tone: "text-primary bg-primary/10" },
    { label: "Farmers", value: farmers.length.toString(), icon: Sprout, hint: "Selling on the market", tone: "text-emerald-600 bg-emerald-50" },
    { label: "Products", value: products.length.toString(), icon: Package, hint: `${activeOrders} open orders`, tone: "text-sky-600 bg-sky-50" },
    { label: "Order Value", value: `$${totalRevenue.toFixed(2)}`, icon: TrendingUp, hint: "Excl. cancelled", tone: "text-amber-600 bg-amber-50" },
  ];

  // Orders grouped by month for the activity chart (last 6 months).
  const activityData = useMemo(() => {
    const buckets: { month: string; orders: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        month: MONTH_FORMAT.format(date),
        orders: orders.filter((order) => {
          const created = new Date(order.created_at);
          return (
            created.getMonth() === date.getMonth() &&
            created.getFullYear() === date.getFullYear()
          );
        }).length,
      });
    }
    return buckets;
  }, [orders]);

  const recentOrders = orders.slice(0, 6);
  const recentUsers = users.slice(0, 5);
  const isLoading = isUsersLoading || isOrdersLoading || isProductsLoading;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <ShieldCheck className="h-4 w-4" /> Platform overview
          </p>
          <h1 className="font-display text-2xl text-foreground">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything happening across Farm Connect, in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users">
            <Button className="gap-2">
              <Users className="h-4 w-4" /> Manage users
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" /> All orders
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow)]"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.tone}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground/80">{stat.hint}</p>
                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
              </div>
            ))}
          </div>

          {/* Unverified accounts callout */}
          {unverified.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900">
                    {unverified.length} account{unverified.length === 1 ? "" : "s"} awaiting email verification
                  </p>
                  <p className="text-amber-700">Send them a nudge or review their details.</p>
                </div>
              </div>
              <Link to="/admin/users">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                  Review
                </Button>
              </Link>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg text-foreground">Order Activity</h2>
                <span className="text-xs text-muted-foreground">Last 6 months</span>
              </div>
              {activityData.every((entry) => entry.orders === 0) ? (
                <div className="flex h-[260px] flex-col items-center justify-center text-muted-foreground">
                  <TrendingUp className="mb-2 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm">No orders yet — activity will show up here.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Orders" fill="hsl(142, 40%, 28%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* New accounts */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="font-display text-lg text-foreground">Newest Accounts</h2>
                <Link to="/admin/users">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View all <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {recentUsers.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No users yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recentUsers.map((account) => (
                    <li key={account.id} className="flex items-center gap-3 px-6 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(account.first_name || account.username || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {account.first_name || account.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                      </div>
                      {account.is_verified ? (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Verified" />
                      ) : (
                        <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-label="Unverified" />
                      )}
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                        {account.user_type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recent orders */}
          <div className="mt-6 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
              <Link to="/admin/orders">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                No orders have been placed yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((order: Order) => (
                      <tr key={order.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3 font-medium text-foreground">#{order.id}</td>
                        <td className="px-6 py-3 text-foreground">
                          {order.first_name} {order.last_name}
                          <span className="block text-xs text-muted-foreground">{order.email}</span>
                        </td>
                        <td className="px-6 py-3 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <span className={statusChipClass(order.status)}>
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-foreground">
                          ${parseFloat(order.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}