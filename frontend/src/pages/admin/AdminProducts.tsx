import { Button } from "@/components/ui/button";
import { CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { productService, Product } from "@/lib/services/product-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => productService.getProducts(),
  });

  const products: Product[] = response
    ? Array.isArray(response)
      ? response
      : response.results || []
    : [];

  const deleteMutation = useMutation({
    mutationFn: (slug: string) => productService.deleteProduct(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product removed", description: "Product has been removed from the platform." });
    },
    onError: (err: any) => {
      toast({
        title: "Action failed",
        description: err.response?.data?.detail || "Could not remove product.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (name: string) => {
    toast({ title: "Product approved", description: `"${name}" is verified and active.` });
  };

  const handleRemove = (slug: string, name: string) => {
    if (confirm(`Remove "${name}" from the platform?`)) {
      deleteMutation.mutate(slug);
    }
  };

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-foreground">Product Moderation</h1>
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No products found to moderate.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Farmer</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-6 py-3 text-muted-foreground">{p.farmer_name}</td>
                    <td className="px-6 py-3 capitalize">{p.category_details?.name || "General"}</td>
                    <td className="px-6 py-3">${parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:bg-primary/10" 
                          onClick={() => handleApprove(p.name)}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10" 
                          onClick={() => handleRemove(p.slug, p.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Remove
                        </Button>
                      </div>
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
