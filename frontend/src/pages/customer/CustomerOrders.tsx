import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  formatCustomerOrderStatus,
  formatOrderItemQuantityWithUnit,
  getOrderFulfillmentNotice,
  getOrderItemProductName,
  Order,
  orderService,
} from "@/lib/services/order-service";

export default function CustomerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    orderService
      .getOrders()
      .then(setOrders)
      .catch((requestError) => {
        console.error("Could not load customer orders", requestError);
        setError(true);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-6 font-display text-3xl text-foreground">My Orders</h1>
        <div className="rounded-lg border border-border bg-card">
          <div className="hidden border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[0.8fr,1fr,2fr,1fr,1fr,auto]">
            <span>Order</span>
            <span>Date</span>
            <span>Items</span>
            <span>Status</span>
            <span>Total</span>
            <span></span>
          </div>
          {error ? (
            <p className="p-8 text-center text-destructive">
              Could not load your orders. Please try again.
            </p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/40" />
              <h2 className="mb-2 font-display text-xl text-foreground">No orders yet</h2>
              <p className="mb-6 text-sm">
                Your order history will appear here once you start shopping!
              </p>
              <Link to="/marketplace">
                <Button>Browse Marketplace</Button>
              </Link>
            </div>
          ) : (
            orders.map((o) => {
              const notice = getOrderFulfillmentNotice(o);
              const hasAdjustment =
                o.effective_total !== undefined &&
                (Number(o.rejected_subtotal || 0) > 0 || o.fulfillment_status === "all_rejected");
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:grid sm:grid-cols-[0.8fr,1fr,2fr,1fr,1fr,auto] sm:items-center sm:px-6"
                >
                  <span className="font-medium text-foreground">#{o.id}</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {(o.items || []).map((item) => (
                      <p key={item.id} className="text-foreground">
                        {getOrderItemProductName(item)}:{" "}
                        <span className="text-muted-foreground">
                          {formatOrderItemQuantityWithUnit(item)} × ${Number(item.price).toFixed(2)}{" "}
                          <span className="capitalize">({item.status})</span>
                        </span>
                      </p>
                    ))}
                    {notice.primary && (
                      <p className="pt-1 text-[11px] font-medium text-amber-700">{notice.primary}</p>
                    )}
                    {notice.provisional && (
                      <p className="text-[11px] text-muted-foreground">{notice.provisional}</p>
                    )}
                  </div>
                  <span>
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                      {formatCustomerOrderStatus(o)}
                    </span>
                  </span>
                  <div>
                    <span className="font-medium text-foreground">
                      ${Number(o.total_amount).toFixed(2)}
                    </span>
                    {hasAdjustment && (
                      <p className="text-[11px] text-muted-foreground">
                        Effective owed: ${Number(o.effective_total).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Link to={`/customer/orders/${o.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-1 h-4 w-4" /> Track
                    </Button>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
