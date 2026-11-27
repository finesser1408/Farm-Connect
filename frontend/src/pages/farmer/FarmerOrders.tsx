import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  formatOrderItemQuantityWithUnit,
  getOrderItemProductName,
  orderService,
  OrderItem,
} from "@/lib/services/order-service";
import { useToast } from "@/hooks/use-toast";

export default function FarmerOrders() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    orderService
      .getFarmerOrders()
      .then(setOrders)
      .catch((err) => {
        console.error("Failed to fetch farmer orders", err);
        toast({ title: "Error", description: "Could not load orders.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const acceptOrder = async (id: number) => {
    try {
      const updated = await orderService.updateOrderItemStatus(id, "accepted");
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
      toast({ title: "Order accepted", description: "The item status was updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update order.", variant: "destructive" });
    }
  };

  const rejectOrder = async (id: number) => {
    try {
      const updated = await orderService.updateOrderItemStatus(id, "rejected");
      setOrders((current) => current.map((order) => (order.id === id ? updated : order)));
      toast({ title: "Order rejected", description: "The item status was updated." });
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
    <div className="min-w-0">
      <h1 className="mb-6 font-display text-2xl text-foreground">Order Management</h1>
      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center sm:p-12">
          <p className="text-muted-foreground">
            No orders yet. They will appear here when customers buy your products.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border md:hidden">
            {orders.map((o) => {
              const productName = getOrderItemProductName(o);
              const qtyLabel = formatOrderItemQuantityWithUnit(o);
              const subtotal = Number(o.get_cost ?? Number(o.price) * o.quantity).toFixed(2);
              return (
                <li key={o.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{productName}</p>
                      <p className="text-xs text-muted-foreground">
                        #{o.id} · {qtyLabel} × ${Number(o.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-medium text-foreground">${subtotal}</p>
                      <p className="text-xs capitalize text-muted-foreground">{o.status}</p>
                    </div>
                  </div>
                  {o.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary"
                        onClick={() => acceptOrder(o.id)}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => rejectOrder(o.id)}
                      >
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Qty &amp; Unit</th>
                  <th className="px-6 py-3">Unit Price</th>
                  <th className="px-6 py-3">Subtotal</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => {
                  const productName = getOrderItemProductName(o);
                  const qtyLabel = formatOrderItemQuantityWithUnit(o);
                  const subtotal = Number(o.get_cost ?? Number(o.price) * o.quantity).toFixed(2);
                  return (
                    <tr key={o.id}>
                      <td className="px-6 py-3 font-medium text-foreground">#{o.id}</td>
                      <td className="px-6 py-3 text-foreground">{productName}</td>
                      <td className="px-6 py-3">{qtyLabel}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        ${Number(o.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 font-medium">${subtotal}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <span className="px-2 capitalize text-muted-foreground">{o.status}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            disabled={o.status !== "pending"}
                            onClick={() => acceptOrder(o.id)}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" /> Accept
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={o.status !== "pending"}
                            onClick={() => rejectOrder(o.id)}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
