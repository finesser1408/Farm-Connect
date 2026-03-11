import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const orders = [
  { id: "ORD-001", date: "2026-03-10", status: "Delivered", total: 24.50, items: 3 },
  { id: "ORD-002", date: "2026-03-09", status: "Processing", total: 15.00, items: 1 },
  { id: "ORD-003", date: "2026-03-08", status: "Shipped", total: 32.00, items: 4 },
  { id: "ORD-004", date: "2026-03-05", status: "Delivered", total: 18.50, items: 2 },
  { id: "ORD-005", date: "2026-03-01", status: "Delivered", total: 45.00, items: 5 },
];

export default function CustomerOrders() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-6 font-display text-3xl text-foreground">My Orders</h1>
        <div className="rounded-lg border border-border bg-card">
          <div className="hidden border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr,1fr,1fr,1fr,auto]">
            <span>Order</span><span>Date</span><span>Status</span><span>Total</span><span></span>
          </div>
          {orders.map((o) => (
            <div key={o.id} className="flex flex-col gap-2 border-b border-border p-4 last:border-0 sm:grid sm:grid-cols-[1fr,1fr,1fr,1fr,auto] sm:items-center sm:px-6">
              <span className="font-medium text-foreground">{o.id}</span>
              <span className="text-sm text-muted-foreground">{o.date}</span>
              <span><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Delivered" ? "bg-primary/10 text-primary" : o.status === "Shipped" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{o.status}</span></span>
              <span className="font-medium text-foreground">${o.total.toFixed(2)}</span>
              <Link to={`/customer/orders/${o.id}`}><Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> Track</Button></Link>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
