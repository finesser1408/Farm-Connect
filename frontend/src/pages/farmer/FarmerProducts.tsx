import { Link } from "react-router-dom";
import { Plus, Trash2, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productService, Product } from "@/lib/services/product-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/api-client";

export default function FarmerProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useQuery({
    queryKey: ["farmer-products"],
    queryFn: () => productService.getProducts({ farmer: "me" }),
  });

  const products: Product[] = response
    ? Array.isArray(response)
      ? response
      : response.results || []
    : [];

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => productService.deleteProduct(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted", description: "The product was successfully removed." });
    },
    onError: (err: any) => {
      toast({
        title: "Delete failed",
        description: err.response?.data?.detail || "Could not delete product.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (slug: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(slug);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-foreground">My Products</h1>
        <Link to="/farmer/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PackageOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">No products listed yet</p>
            <p className="text-sm mt-1 mb-4">Start listing your harvest to sell directly to buyers!</p>
            <Link to="/farmer/products/new">
              <Button size="sm">Add First Product</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.image ? (
                            <img
                              src={getImageUrl(p.image)}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              🌱
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 capitalize text-muted-foreground">
                      {p.category_details?.name || "General"}
                    </td>
                    <td className="px-6 py-3 text-foreground font-medium">
                      ${parseFloat(p.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-3">{p.stock}</td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(p.slug, p.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
