import { useCallback, useEffect, useState, type ComponentType } from "react";
import { DollarSign, Package, RefreshCw, Sprout, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { getAuthErrorMessage } from "@/lib/auth-context";
import {
  adminService,
  type AdminDashboardStats,
  type AdminMonthlyOrderActivity,
} from "@/lib/services/admin-service";

interface StatCardItem {
  label: string;
  value: string;
  caption?: string;
  icon: ComponentType<{ className?: string }>;
}

export default function AdminDashboard() {
  const [statsData, setStatsData] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.getDashboardStats();
      setStatsData(data);
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const verifiedSalesDisplay =
    statsData && statsData.verified_payments_enabled && statsData.verified_sales_total !== null
      ? `$${Number(statsData.verified_sales_total).toFixed(2)}`
      : "Not available";

  const verifiedSalesCaption =
    statsData && statsData.verified_payments_enabled && statsData.verified_sales_total !== null
      ? "Externally verified completed payments"
      : "Payment verification not yet enabled";

  const cards: StatCardItem[] = [
    {
      label: "Total Users",
      value: statsData ? String(statsData.total_users) : "0",
      icon: Users,
    },
    {
      label: "Total Farmers",
      value: statsData ? String(statsData.total_farmers) : "0",
      icon: Sprout,
    },
    {
      label: "Total Products",
      value: statsData ? String(statsData.total_products) : "0",
      icon: Package,
    },
    {
      label: "Total Sales (Verified)",
      value: verifiedSalesDisplay,
      caption: verifiedSalesCaption,
      icon: DollarSign,
    },
  ];

  const activityData: AdminMonthlyOrderActivity[] = statsData?.monthly_activity ?? [];
  const totalActivityOrders = activityData.reduce((sum, item) => sum + item.orders, 0);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live marketplace overview across registered accounts, catalog listings, and order activity.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading dashboard statistics…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchStats} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="flex min-w-0 items-start gap-4 rounded-lg border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-1 break-words text-xl font-bold text-foreground sm:text-2xl">
                    {card.value}
                  </p>
                  {card.caption && (
                    <p className="mt-1 text-xs text-muted-foreground">{card.caption}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Order Activity Chart */}
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg text-foreground">Marketplace Order Activity</h2>
                <p className="text-xs text-muted-foreground">
                  Non-cancelled orders placed over the last 6 months (order count, not revenue).
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Total non-cancelled orders: {statsData?.total_orders ?? 0}
              </span>
            </div>

            {activityData.length === 0 || totalActivityOrders === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No order activity recorded in the last 6 months.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monthly order counts will appear here as customers place orders.
                </p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(35, 20%, 85%)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "hsl(30, 10%, 45%)", fontSize: 12 }} />
                    <Tooltip />
                    <Bar
                      dataKey="orders"
                      name="Orders"
                      fill="hsl(142, 40%, 28%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
