import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, Eye, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";

export default function CustomerOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: () => orderService.getOrders(),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-6 font-display text-3xl text-foreground">My Orders</h1>
        <div className="rounded-lg border border-border bg-card">
          <div className="hidden border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr,1fr,1fr,1fr,auto]">
            <span>Order</span><span>Date</span><span>Status</span><span>Total</span><span></span>
          </div>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/40" />
              <h2 className="mb-2 font-display text-xl text-foreground">No orders yet</h2>
              <p className="mb-6 text-sm">Your order history will appear here once you start shopping!</p>
              <Link to="/marketplace"><Button>Browse Marketplace</Button></Link>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:grid sm:grid-cols-[1fr,1fr,1fr,1fr,auto] sm:items-center sm:px-6">
                <span className="font-medium text-foreground">#{o.id}</span>
                <span className="text-sm text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                <span>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    o.status === "Delivered" 
                      ? "bg-primary/10 text-primary" 
                      : o.status === "Shipped" || o.status === "Accepted" 
                      ? "bg-emerald-50 text-emerald-700" 
                      : o.status === "Cancelled" || o.status === "Rejected"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {o.status}
                  </span>
                </span>
                <span className="font-medium text-foreground">${parseFloat(o.total_amount).toFixed(2)}</span>
                <Link to={`/customer/orders/${o.id}`}>
                  <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> Track</Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
