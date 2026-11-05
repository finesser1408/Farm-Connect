import { useEffect, useState } from "react";
import { Order, orderService } from "@/lib/services/order-service";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    orderService.getAdminOrders()
      .then(setOrders)
      .catch(requestError => {
        console.error("Could not load admin orders", requestError);
        setError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">All Orders</h1>
      {isLoading ? <p>Loading orders…</p> : error ? <p className="text-destructive">Could not load orders.</p> : orders.length === 0 ? (
        <p className="text-muted-foreground">No orders found.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3">Order</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Product</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {orders.flatMap(order => order.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-3 font-medium">#{order.id}</td>
                    <td className="px-6 py-3 text-muted-foreground">{order.customer}</td>
                    <td className="px-6 py-3">{item.product.name} × {item.quantity}</td>
                    <td className="px-6 py-3 capitalize">{order.status} / {item.status}</td>
                    <td className="px-6 py-3 text-right">${Number(order.total_amount).toFixed(2)}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
