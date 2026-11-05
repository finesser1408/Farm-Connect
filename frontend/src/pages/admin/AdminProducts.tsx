import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Product, productService } from "@/lib/services/product-service";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    productService.getProducts({ available: "all" })
      .then(data => setProducts(Array.isArray(data) ? data : data.results))
      .catch(error => {
        console.error("Could not load products", error);
        toast({ title: "Error", description: "Could not load products.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const removeProduct = async (product: Product) => {
    try {
      await productService.deleteProduct(product.slug);
      setProducts(current => current.filter(item => item.id !== product.id));
      toast({ title: "Product removed" });
    } catch (error) {
      console.error("Could not remove product", error);
      toast({ title: "Error", description: "Could not remove this product.", variant: "destructive" });
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Products</h1>
      {isLoading ? <p>Loading products…</p> : products.length === 0 ? <p className="text-muted-foreground">No products found.</p> : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3">Product</th><th className="px-6 py-3">Farmer</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {products.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-3 font-medium text-foreground">{product.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{product.farmer_name}</td>
                    <td className="px-6 py-3">{product.category_details?.name || "Uncategorized"}</td>
                    <td className="px-6 py-3">${Number(product.price).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right">
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeProduct(product)} aria-label={`Remove ${product.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
