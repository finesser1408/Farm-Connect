import { Package, ShoppingCart, DollarSign, Clock } from "lucide-react";

const stats = [
  { label: "Total Products", value: "24", icon: Package, color: "text-primary" },
  { label: "Total Orders", value: "156", icon: ShoppingCart, color: "text-secondary" },
  { label: "Monthly Revenue", value: "$2,340", icon: DollarSign, color: "text-primary" },
  { label: "Pending Orders", value: "8", icon: Clock, color: "text-accent-foreground" },
];

const recentOrders = [
  { id: "ORD-201", customer: "Alice M.", product: "Organic Tomatoes", qty: 5, status: "Processing", amount: 17.50 },
  { id: "ORD-202", customer: "Bob K.", product: "Fresh Milk", qty: 3, status: "Shipped", amount: 7.50 },
  { id: "ORD-203", customer: "Carol Z.", product: "Farm Eggs", qty: 2, status: "Pending", amount: 8.00 },
];

export default function FarmerDashboard() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Farm Dashboard</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Order</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Product</th><th className="px-6 py-3">Qty</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{o.id}</td>
                  <td className="px-6 py-3 text-muted-foreground">{o.customer}</td>
                  <td className="px-6 py-3 text-foreground">{o.product}</td>
                  <td className="px-6 py-3">{o.qty}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Shipped" ? "bg-primary/10 text-primary" : o.status === "Processing" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                  <td className="px-6 py-3 text-right font-medium text-foreground">${o.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
