import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/lib/product-context";
import { useAuth } from "@/lib/auth-context";
import { productService, Category } from "@/lib/services/product-service";
import { useEffect } from "react";

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", category: "", price: "", quantity: "", description: "" });
  
  useEffect(() => {
    productService.getCategories().then(setCategories).catch(console.error);
  }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await productService.createProduct({
        name: form.name,
        price: form.price,
        stock: parseInt(form.quantity),
        description: form.description,
        category: form.category ? parseInt(form.category) : null,
      });
      
      toast({ title: "Product published!", description: `${form.name} is now live on the marketplace.` });
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Failed to add product", error);
      toast({ 
        title: "Failed to publish", 
        description: error.response?.data?.detail || "Check your details and try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div><Label htmlFor="pname">Product Name</Label><Input id="pname" placeholder="Organic Tomatoes" value={form.name} onChange={set("name")} required /></div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select id="category" value={form.category} onChange={set("category")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="price">Price ($)</Label><Input id="price" type="number" step="0.01" placeholder="3.50" value={form.price} onChange={set("price")} required /></div>
          <div><Label htmlFor="qty">Quantity</Label><Input id="qty" type="number" placeholder="50" value={form.quantity} onChange={set("quantity")} required /></div>
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" rows={4} placeholder="Describe your product..." value={form.description} onChange={set("description")} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing..." : "Publish Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} disabled={isSubmitting}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
