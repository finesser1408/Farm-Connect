import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/lib/product-context";
import { useAuth } from "@/lib/auth-context";

export default function FarmerProducts() {
  const { products } = useProducts();
  const { user } = useAuth();
  const farmerProducts = products.filter((p) => p.farmer === user?.farmName);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">My Products</h1>
        <Link to="/farmer/products/new"><Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button></Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Product</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3">Stock</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {farmerProducts.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-6 py-3 capitalize text-muted-foreground">{p.category}</td>
                  <td className="px-6 py-3 text-foreground">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-3">{p.stock}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
