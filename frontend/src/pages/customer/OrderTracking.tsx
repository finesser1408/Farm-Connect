import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  formatCustomerOrderStatus,
  formatOrderItemQuantityWithUnit,
  getOrderItemProductName,
  isSimulatedOrderPayment,
  Order,
  orderService,
} from "@/lib/services/order-service";

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    orderService
      .getOrder(Number(orderId))
      .then(setOrder)
      .catch((requestError) => {
        console.error("Could not load order", requestError);
        setError(true);
      });
  }, [orderId]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link
          to="/customer/orders"
          className="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <h1 className="mb-2 font-display text-3xl text-foreground">Order {orderId}</h1>
        {error ? (
          <p className="text-destructive">Could not load this order.</p>
        ) : !order ? (
          <p>Loading order…</p>
        ) : (
          <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6">
            <p className="mb-2">
              Status: <span className="font-medium capitalize">{formatCustomerOrderStatus(order)}</span>
            </p>
            <p className="mb-2 text-sm text-muted-foreground">
              Placed {new Date(order.created_at).toLocaleString()}
            </p>
            <p className="mb-4 text-sm">
              Payment: {order.payment_method || "Not recorded"} (
              {isSimulatedOrderPayment(order)
                ? "Order Placed — Simulated Payment; no real charge"
                : order.payment_status || "unknown"}
              )
            </p>
            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const name = getOrderItemProductName(item);
                const qtyWithUnit = formatOrderItemQuantityWithUnit(item);
                const subtotal = Number(
                  item.get_cost ?? Number(item.price) * item.quantity,
                ).toFixed(2);
                return (
                  <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {qtyWithUnit} × ${Number(item.price).toFixed(2)}{" "}
                        <span className="capitalize">({item.status})</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-medium text-foreground">Subtotal: ${subtotal}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-right font-bold">
              Total: ${Number(order.total_amount).toFixed(2)}
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
