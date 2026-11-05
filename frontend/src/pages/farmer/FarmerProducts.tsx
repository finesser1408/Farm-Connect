import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Product, productService } from "@/lib/services/product-service";

export default function FarmerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadProducts = () => productService.getProducts({ farmer: "me" })
    .then(data => setProducts(Array.isArray(data) ? data : data.results));

  useEffect(() => {
    loadProducts()
      .catch(error => {
        console.error("Could not load farmer products", error);
        toast({ title: "Error", description: "Could not load your products.", variant: "destructive" });
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">My Products</h1>
        <Link to="/farmer/products/new"><Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button></Link>
      </div>
      {isLoading ? <p>Loading products…</p> : products.length === 0 ? <p className="text-muted-foreground">You have not listed any products yet.</p> : (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="px-6 py-3">Product</th><th className="px-6 py-3">Category</th><th className="px-6 py-3">Price</th><th className="px-6 py-3">Stock</th><th className="px-6 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {products.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-3 font-medium text-foreground">{product.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{product.category_details?.name || "Uncategorized"}</td>
                    <td className="px-6 py-3">${Number(product.price).toFixed(2)}</td>
                    <td className="px-6 py-3">{product.stock}</td>
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
