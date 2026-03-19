import { Package, Clock, CheckCircle, ShoppingBag } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Total Orders", value: "0", icon: Package, color: "text-primary" },
  { label: "Pending", value: "0", icon: Clock, color: "text-warning" },
  { label: "Delivered", value: "0", icon: CheckCircle, color: "text-primary" },
];

const recentOrders: any[] = [];

export default function CustomerDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-6 font-display text-3xl text-foreground">My Dashboard</h1>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted ${s.color}`}><s.icon className="h-6 w-6" /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
            <Link to="/customer/orders"><Button variant="ghost" size="sm" className="text-primary">View All</Button></Link>
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
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <span className="font-medium text-foreground">{o.id}</span>
                  <span className="text-muted-foreground">{o.date}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Delivered" ? "bg-primary/10 text-primary" : o.status === "Shipped" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{o.status}</span>
                  <span className="font-medium text-foreground">${o.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
