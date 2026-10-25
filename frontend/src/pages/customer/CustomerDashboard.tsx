import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  Settings,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";
import { useAuth } from "@/lib/auth-context";
import { statusChipClass, statusLabel, normalizeStatus } from "@/lib/status";

const ACTIVE_STATUSES = ["pending", "processing", "accepted", "shipped", "paid"];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => orderService.getOrders(),
  });

  const firstName = user?.first_name || user?.username || "there";

  const totalOrders = orders.length;
  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(normalizeStatus(order.status)),
  ).length;
  const deliveredOrders = orders.filter(
    (order) => normalizeStatus(order.status) === "delivered",
  ).length;
  const totalSpent = orders
    .filter((order) => normalizeStatus(order.status) !== "cancelled")
    .reduce((sum, order) => sum + parseFloat(order.total_amount || "0"), 0);

  const stats = [
    { label: "Total Orders", value: totalOrders.toString(), icon: Package, hint: "All time", tone: "text-primary bg-primary/10" },
    { label: "In Progress", value: activeOrders.toString(), icon: Clock, hint: "Being prepared", tone: "text-amber-600 bg-amber-50" },
    { label: "Delivered", value: deliveredOrders.toString(), icon: PackageCheck, hint: "At your door", tone: "text-emerald-600 bg-emerald-50" },
    { label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, icon: Wallet, hint: "Excl. cancelled", tone: "text-sky-600 bg-sky-50" },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        {/* Greeting */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Store className="h-4 w-4" /> Farm Connect
            </p>
            <h1 className="font-display text-3xl text-foreground">
              Hello, {firstName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your orders, manage your account and keep shopping fresh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/marketplace">
              <Button className="gap-2">
                <ShoppingBag className="h-4 w-4" /> Shop produce
              </Button>
            </Link>
            <Link to="/customer/orders">
              <Button variant="outline" className="gap-2">
                <MapPin className="h-4 w-4" /> Track orders
              </Button>
            </Link>
            <Link to="/customer/account">
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" /> Account
              </Button>
            </Link>
          </div>
        </div>

        {/* Email verification prompt */}
        {user && !user.is_verified && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">Your email isn't verified yet</p>
                <p className="text-amber-700">
                  Enter the one-time code we send you to secure your account.
                </p>
              </div>
            </div>
            <Link to="/verify-email">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                Verify now
              </Button>
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
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
                <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
                <Link to="/customer/orders">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingBag className="mb-3 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm">No orders yet. Start shopping to see your orders here!</p>
                  <Link to="/marketplace" className="mt-3">
                    <Button size="sm">Browse Marketplace</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-sm transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Gauge className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-medium text-foreground">Order #{order.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <span className={statusChipClass(order.status)}>
                        {statusLabel(order.status)}
                      </span>

                      <span className="font-medium text-foreground">
                        ${parseFloat(order.total_amount).toFixed(2)}
                      </span>

                      <Link to={`/customer/orders/${order.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 text-primary">
                          Track <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verified badge strip */}
            {user?.is_verified && (
              <p className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
                {user.email} is verified
              </p>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}