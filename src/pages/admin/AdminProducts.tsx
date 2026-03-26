import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/lib/mock-data";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const { toast } = useToast();

  // TODO: replace with real API call
  useEffect(() => {
    setProducts([]);
  }, []);

  const handleApprove = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast({ title: "Product approved", description: "Product has been approved and removed from moderation." });
  };

  const handleRemove = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
    toast({ title: "Product removed", description: "Product has been removed from the platform." });
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Product Moderation</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="px-6 py-3">Product</th><th className="px-6 py-3">Farmer</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-6 py-3 text-muted-foreground">{p.farmer}</td>
                  <td className="px-6 py-3 capitalize">{p.category}</td>
                  <td className="px-6 py-3">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" className="text-primary" onClick={() => handleApprove(p.id)}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemove(p.id)}><Trash2 className="mr-1 h-4 w-4" /> Remove</Button>
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
