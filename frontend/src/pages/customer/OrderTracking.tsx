import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, Circle, Loader2, Package, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";

export default function OrderTracking() {
  const { orderId } = useParams();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => orderService.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const statusMap: Record<string, number> = {
    "Pending": 0,
    "Accepted": 1,
    "Processing": 2,
    "Shipped": 3,
    "Delivered": 4,
  };

  const currentStage = order ? (statusMap[order.status] ?? 0) : 0;
  const isCancelled = order?.status === "Cancelled" || order?.status === "Rejected";

  const stages = [
    { label: "Order Placed", description: order ? `Placed on ${new Date(order.created_at).toLocaleDateString()}` : "Order received" },
    { label: "Farmer Accepted", description: "Farmer confirmed harvest" },
    { label: "Processing & Packing", description: "Harvested and packaged fresh" },
    { label: "In Transit", description: "Out for delivery" },
    { label: "Delivered", description: "Delivered to destination" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link to="/customer/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <h1 className="mb-2 font-display text-3xl text-foreground">Order #{orderId}</h1>
        <p className="mb-8 text-muted-foreground">Track your order status in real time</p>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            Order not found or you do not have permission to view this order.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Tracking progress */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
              <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                <div>
                  <span className="text-xs uppercase text-muted-foreground">Status</span>
                  <p className={`font-semibold text-lg ${isCancelled ? "text-destructive" : "text-primary"}`}>
                    {order.status}
                  </p>
                </div>
                <div>
                  <span className="text-xs uppercase text-muted-foreground">Date Placed</span>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {isCancelled ? (
                <div className="rounded-md bg-destructive/10 p-4 text-destructive">
                  This order was {order.status.toLowerCase()}. Please contact support if you have questions.
                </div>
              ) : (
                <div className="space-y-0">
                  {stages.map((s, i) => (
                    <div key={s.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${i <= currentStage ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {i < currentStage ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                        </div>
                        {i < stages.length - 1 && <div className={`h-10 w-0.5 ${i < currentStage ? "bg-primary" : "bg-border"}`} />}
                      </div>
                      <div className="pb-8">
                        <p className={`font-medium ${i <= currentStage ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order details summary */}
            <div className="rounded-lg border border-border bg-card p-6 h-fit space-y-4">
              <h2 className="font-display text-lg text-foreground">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{order.address}, {order.city}</span>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Items</h3>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product?.name || "Product"} × {item.quantity}</span>
                        <span className="font-medium text-foreground">${parseFloat(item.get_cost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-4 flex justify-between font-semibold text-foreground">
                <span>Total Amount</span>
                <span>${parseFloat(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
