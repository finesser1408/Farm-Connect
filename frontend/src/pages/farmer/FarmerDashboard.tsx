import {
  ArrowRight,
  Clock,
  DollarSign,
  Leaf,
  Loader2,
  Package,
  PackagePlus,
  ShoppingCart,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";
import { productService } from "@/lib/services/product-service";
import { useAuth } from "@/lib/auth-context";
import { normalizeStatus, statusChipClass, statusLabel } from "@/lib/status";

const PENDING_STATUSES = ["pending", "processing"];

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: () => orderService.getFarmerOrders(),
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["farmer-products"],
    queryFn: () => productService.getProducts({ farmer: "me" }),
  });

  const productsList = productsData
    ? Array.isArray(productsData)
      ? productsData
      : productsData.results || []
    : [];

  const totalEarnings = orders
    .filter((order) => ["accepted", "shipped", "delivered", "paid"].includes(normalizeStatus(order.status)))
    .reduce((sum, order) => sum + parseFloat(order.get_cost || "0"), 0);

  const pendingOrders = orders.filter((order) =>
    PENDING_STATUSES.includes(normalizeStatus(order.status)),
  ).length;

  const lowStock = productsList.filter((product) => product.stock <= 5).length;

  const stats = [
    { label: "My Products", value: productsList.length.toString(), icon: Package, hint: lowStock > 0 ? `${lowStock} low on stock` : "All well stocked", tone: "text-primary bg-primary/10" },
    { label: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, hint: "Items sold", tone: "text-sky-600 bg-sky-50" },
    { label: "Pending Orders", value: pendingOrders.toString(), icon: Clock, hint: "Need your attention", tone: "text-amber-600 bg-amber-50" },
    { label: "Total Revenue", value: `$${totalEarnings.toFixed(2)}`, icon: TrendingUp, hint: "Accepted & delivered", tone: "text-emerald-600 bg-emerald-50" },
  ];

  const recentOrders = orders.slice(0, 5);
  const isLoading = isOrdersLoading || isProductsLoading;
  const firstName = user?.first_name || user?.username || "farmer";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sprout className="h-4 w-4" /> Farmer workspace
          </p>
          <h1 className="font-display text-2xl text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening on your farm today.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farmer/products/new">
            <Button className="gap-2">
              <PackagePlus className="h-4 w-4" /> Add Product
            </Button>
          </Link>
          <Link to="/farmer/analytics">
            <Button variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Analytics
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

          {/* Recent orders */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg text-foreground">Recent Incoming Orders</h2>
              <Link to="/farmer/orders">
                <Button variant="ghost" size="sm" className="gap-1 text-primary">
                  View All Orders <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Leaf className="mb-3 h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm">
                  No customer orders yet. Once buyers order your products, they will appear here.
                </p>
                <Link to="/farmer/products/new" className="mt-3">
                  <Button size="sm">Add your first product</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3 font-medium text-foreground">#{order.id}</td>
                        <td className="px-6 py-3 text-foreground">{order.product?.name || "Product"}</td>
                        <td className="px-6 py-3">{order.quantity}</td>
                        <td className="px-6 py-3">
                          <span className={statusChipClass(order.status)}>
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-foreground">
                          ${parseFloat(order.get_cost || "0").toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Link
              to="/farmer/products"
              className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow)]"
            >
              <Package className="mb-2 h-6 w-6 text-primary" />
              <p className="font-medium text-foreground">Manage products</p>
              <p className="text-sm text-muted-foreground">Update prices and stock levels</p>
            </Link>
            <Link
              to="/farmer/orders"
              className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow)]"
            >
              <ShoppingCart className="mb-2 h-6 w-6 text-primary" />
              <p className="font-medium text-foreground">Incoming orders</p>
              <p className="text-sm text-muted-foreground">Accept and fulfil customer orders</p>
            </Link>
            <Link
              to="/farmer/profile"
              className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-[var(--card-shadow)]"
            >
              <DollarSign className="mb-2 h-6 w-6 text-primary" />
              <p className="font-medium text-foreground">Profile & security</p>
              <p className="text-sm text-muted-foreground">Edit farm details, change password</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}