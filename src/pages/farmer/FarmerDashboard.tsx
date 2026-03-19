import { Package, ShoppingCart, DollarSign, Clock } from "lucide-react";

export default function FarmerDashboard() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Farm Dashboard</h1>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stats cards will be populated from props or API data */}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg text-foreground">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Orders will be populated from props or API data */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}