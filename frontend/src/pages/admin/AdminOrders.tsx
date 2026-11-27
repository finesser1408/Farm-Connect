import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage } from "@/lib/auth-context";
import { formatQuantityNumber } from "@/lib/product-units";
import { Order, OrderItem, orderService } from "@/lib/services/order-service";

function getSnapshotProductName(item: OrderItem): string {
  const snap = (item.product_name || "").trim();
  if (snap) return snap;
  return item.product?.name || "Product";
}

function getSnapshotQtyWithUnit(item: OrderItem): string {
  const qty = formatQuantityNumber(item.quantity);
  const unit = (item.unit_label || "").trim();
  return unit ? `${qty} ${unit}` : qty;
}

type OrderStatusFilter = "all" | "pending" | "paid" | "shipped" | "delivered" | "cancelled";

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-primary/10 text-primary",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-primary/15 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const ITEM_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-primary/10 text-primary",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-primary/15 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

function formatOrderDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function getCustomerDisplayName(order: Order) {
  const fullName = [order.first_name, order.last_name].filter(Boolean).join(" ").trim();
  return fullName || order.customer || order.email || "Customer";
}

function formatPaymentLabel(order: Order) {
  const method = order.payment_method?.trim() || "Unspecified";
  return method;
}

function isSimulatedPayment(order: Order) {
  return Boolean(order.payment_method && /simulated/i.test(order.payment_method));
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await orderService.getAdminOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status.toLowerCase() !== statusFilter) {
        return false;
      }
      if (!query) return true;
      const orderIdMatch = `#${order.id}`.includes(query) || String(order.id).includes(query);
      const customerMatch =
        getCustomerDisplayName(order).toLowerCase().includes(query) ||
        (order.customer || "").toLowerCase().includes(query) ||
        (order.email || "").toLowerCase().includes(query);
      const productMatch = order.items.some((item) =>
        getSnapshotProductName(item).toLowerCase().includes(query),
      );
      return orderIdMatch || customerMatch || productMatch;
    });
  }, [orders, searchInput, statusFilter]);

  const hasActiveFilters = Boolean(searchInput.trim() || statusFilter !== "all");

  const handleResetFilters = () => {
    setSearchInput("");
    setStatusFilter("all");
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">All Orders</h1>
          <p className="text-sm text-muted-foreground">
            Inspect customer orders, grouped product line items, and payment methods.
          </p>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="admin-order-search" className="text-xs uppercase text-muted-foreground">
            Search Orders
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-order-search"
              type="search"
              placeholder="Search by order #, customer name/email, or product..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="admin-order-status" className="text-xs uppercase text-muted-foreground">
              Order Status
            </Label>
            <select
              id="admin-order-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatusFilter)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading orders…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchOrders} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No orders found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search query or order status filter."
              : "Customer orders will appear here once placed."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile (< 768px): One Card Per Order */}
          <ul className="divide-y divide-border md:hidden" aria-label="Mobile order cards">
            {filteredOrders.map((order) => {
              const customerName = getCustomerDisplayName(order);
              const customerEmail = order.customer || order.email;
              const simulated = isSimulatedPayment(order);

              return (
                <li
                  key={order.id}
                  data-testid={`admin-order-card-${order.id}`}
                  className="space-y-3 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatOrderDate(order.created_at)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        ORDER_STATUS_BADGE[order.status.toLowerCase()] ?? "bg-muted text-foreground"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-foreground">{customerName}</p>
                    {customerEmail && customerEmail !== customerName && (
                      <p className="break-all text-muted-foreground">{customerEmail}</p>
                    )}
                  </div>

                  {/* Grouped Products inside Order Card */}
                  <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Items ({order.items.length})
                    </p>
                    <ul className="divide-y divide-border/60 text-xs">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-medium text-foreground">
                              {getSnapshotProductName(item)} × {getSnapshotQtyWithUnit(item)}
                            </p>
                            <p className="text-muted-foreground">
                              ${Number(item.price).toFixed(2)} · Subtotal: $
                              {Number(item.get_cost ?? Number(item.price) * item.quantity).toFixed(
                                2,
                              )}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                              ITEM_STATUS_BADGE[item.status.toLowerCase()] ?? "bg-muted text-foreground"
                            }`}
                          >
                            Item: {item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground">Payment:</span>
                      <Badge variant={simulated ? "outline" : "secondary"} className="text-xs font-normal">
                        {formatPaymentLabel(order)}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      Total: ${Number(order.total_amount).toFixed(2)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablet / Desktop (>= 768px): One Row Per Order with Grouped Products */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Products &amp; Item Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Order Status</th>
                  <th className="px-4 py-3 text-right">Order Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const customerName = getCustomerDisplayName(order);
                  const customerEmail = order.customer || order.email;
                  const simulated = isSimulatedPayment(order);

                  return (
                    <tr
                      key={order.id}
                      data-testid={`admin-order-row-${order.id}`}
                      className="align-top"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-medium text-foreground">#{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatOrderDate(order.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{customerName}</p>
                        {customerEmail && customerEmail !== customerName && (
                          <p className="break-all text-xs text-muted-foreground">{customerEmail}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ul className="space-y-1.5">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-medium text-foreground">
                                {getSnapshotProductName(item)} × {getSnapshotQtyWithUnit(item)}{" "}
                                <span className="font-normal text-muted-foreground">
                                  (${Number(item.get_cost ?? Number(item.price) * item.quantity).toFixed(2)})
                                </span>
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                                  ITEM_STATUS_BADGE[item.status.toLowerCase()] ?? "bg-muted text-foreground"
                                }`}
                              >
                                {item.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={simulated ? "outline" : "secondary"} className="text-xs font-normal">
                          {formatPaymentLabel(order)}
                        </Badge>
                        {order.payment_status && (
                          <p className="mt-1 text-xs capitalize text-muted-foreground">
                            {order.payment_status}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            ORDER_STATUS_BADGE[order.status.toLowerCase()] ?? "bg-muted text-foreground"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-foreground">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
