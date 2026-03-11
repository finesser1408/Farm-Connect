const orders = [
  { id: "ORD-001", customer: "John C.", farmer: "Green Valley", product: "Tomatoes", total: 17.50, status: "Delivered" },
  { id: "ORD-002", customer: "Alice M.", farmer: "Sunrise Berries", product: "Strawberries", total: 25.00, status: "Processing" },
  { id: "ORD-003", customer: "Bob K.", farmer: "Meadow Dairy", product: "Fresh Milk", total: 7.50, status: "Shipped" },
  { id: "ORD-004", customer: "Carol Z.", farmer: "Golden Fields", product: "Maize Meal", total: 13.50, status: "Pending" },
];

export default function AdminOrders() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">All Orders</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Order</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Farmer</th><th className="px-6 py-3">Product</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Total</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{o.id}</td>
                  <td className="px-6 py-3 text-muted-foreground">{o.customer}</td>
                  <td className="px-6 py-3 text-muted-foreground">{o.farmer}</td>
                  <td className="px-6 py-3 text-foreground">{o.product}</td>
                  <td className="px-6 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${o.status === "Delivered" ? "bg-primary/10 text-primary" : o.status === "Shipped" ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>{o.status}</span></td>
                  <td className="px-6 py-3 text-right font-medium text-foreground">${o.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
