import { Package, ShoppingCart, DollarSign, Clock, Loader2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "@/lib/services/order-service";
import { productService } from "@/lib/services/product-service";

export default function FarmerDashboard() {
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: () => orderService.getFarmerOrders(),
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["farmer-products"],
    queryFn: () => productService.getProducts({ farmer: "me" }),
  });

  const productsList = productsData
    ? Array.isArray(productsData)
      ? productsData
      : productsData.results || []
    : [];

  const totalEarnings = orders
    .filter((o) => o.status === "Accepted" || o.status === "Delivered")
    .reduce((sum, o) => sum + parseFloat(o.get_cost || "0"), 0);

  const pendingOrders = orders.filter((o) => o.status === "Pending").length;

  const stats = [
    { label: "My Products", value: productsList.length.toString(), icon: Package, color: "text-primary" },
    { label: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, color: "text-blue-600" },
    { label: "Pending Orders", value: pendingOrders.toString(), icon: Clock, color: "text-amber-600" },
    { label: "Total Revenue", value: `$${totalEarnings.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600" },
  ];

  const recentOrders = orders.slice(0, 5);
  const isLoading = isOrdersLoading || isProductsLoading;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">Farm Dashboard</h1>
        <Link to="/farmer/products/new">
          <Button size="sm">Add Product</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-lg border border-border bg-card p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg text-foreground">Recent Incoming Orders</h2>
              <Link to="/farmer/orders">
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  View All Orders <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No customer orders received yet. Once buyers order your products, they will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="px-6 py-3">Order ID</th>
                      <th className="px-6 py-3">Product</th>
                      <th className="px-6 py-3">Qty</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-6 py-3 font-medium text-foreground">#{o.id}</td>
                        <td className="px-6 py-3 text-foreground">{o.product?.name || "Product"}</td>
                        <td className="px-6 py-3">{o.quantity}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            o.status === "Delivered" || o.status === "Accepted"
                              ? "bg-primary/10 text-primary"
                              : o.status === "Rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-foreground">
                          ${parseFloat(o.get_cost || "0").toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}