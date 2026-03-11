import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

const orders = [
  { id: "ORD-201", customer: "Alice M.", product: "Organic Tomatoes", qty: 5, status: "Pending", amount: 17.50 },
  { id: "ORD-202", customer: "Bob K.", product: "Fresh Milk", qty: 3, status: "Accepted", amount: 7.50 },
  { id: "ORD-203", customer: "Carol Z.", product: "Farm Eggs", qty: 2, status: "Shipped", amount: 8.00 },
  { id: "ORD-204", customer: "Dave P.", product: "Organic Carrots", qty: 4, status: "Pending", amount: 8.00 },
  { id: "ORD-205", customer: "Eve R.", product: "Fresh Spinach", qty: 6, status: "Delivered", amount: 9.00 },
];

export default function FarmerOrders() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Order Management</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Order</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Product</th><th className="px-6 py-3">Qty</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{o.id}</td>
                  <td className="px-6 py-3 text-muted-foreground">{o.customer}</td>
                  <td className="px-6 py-3 text-foreground">{o.product}</td>
                  <td className="px-6 py-3">{o.qty}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Delivered" ? "bg-primary/10 text-primary" : o.status === "Shipped" ? "bg-accent/20 text-accent-foreground" : o.status === "Accepted" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                  <td className="px-6 py-3 text-right">
                    {o.status === "Pending" && (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-primary"><CheckCircle className="mr-1 h-4 w-4" /> Accept</Button>
                        <Button variant="ghost" size="sm" className="text-destructive"><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
