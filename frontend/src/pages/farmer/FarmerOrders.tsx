import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { orderService, OrderItem } from "@/lib/services/order-service";
import { useToast } from "@/hooks/use-toast";

export default function FarmerOrders() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    orderService.getFarmerOrders()
      .then(setOrders)
      .catch(err => {
        console.error("Failed to fetch farmer orders", err);
        toast({ title: "Error", description: "Could not load orders.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const acceptOrder = async (id: number) => {
    try {
      await orderService.updateOrderItemStatus(id, "Accepted");
      setOrders(orders.map(o => o.id === id ? { ...o, status: "Accepted" } : o));
      toast({ title: "Order accepted", description: "The customer will be notified." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order.", variant: "destructive" });
    }
  };

  const rejectOrder = async (id: number) => {
    try {
      await orderService.updateOrderItemStatus(id, "Rejected");
      setOrders(orders.filter(o => o.id !== id));
      toast({ title: "Order rejected", description: "Order removed from your list." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order.", variant: "destructive" });
    }
  };
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Order Management</h1>
      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No orders yet. They will appear here when customers buy your products.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3">ID</th><th className="px-6 py-3">Product</th><th className="px-6 py-3">Qty</th><th className="px-6 py-3">Total</th><th className="px-6 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-6 py-3 font-medium text-foreground">#{o.id}</td>
                    <td className="px-6 py-3 text-foreground">{o.product.name}</td>
                    <td className="px-6 py-3">{o.quantity}</td>
                    <td className="px-6 py-3 font-medium">${o.get_cost}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="text-primary" onClick={() => acceptOrder(o.id)}><CheckCircle className="mr-1 h-4 w-4" /> Accept</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => rejectOrder(o.id)}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
