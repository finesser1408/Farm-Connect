import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/lib/product-context";
import { useAuth } from "@/lib/auth-context";

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addProduct } = useProducts();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", category: "vegetables", price: "", quantity: "", description: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    addProduct({
      name: form.name,
      price: parseFloat(form.price),
      image: "", // placeholder
      farmer: user.farmName || "Unknown Farm",
      farmLocation: user.farmLocation || "Unknown Location",
      category: form.category,
      description: form.description,
      stock: parseInt(form.quantity),
    });
    toast({ title: "Product published!", description: `${form.name} is now live on the marketplace.` });
    navigate("/farmer/products");
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div><Label htmlFor="pname">Product Name</Label><Input id="pname" placeholder="Organic Tomatoes" value={form.name} onChange={set("name")} required /></div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select id="category" value={form.category} onChange={set("category")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
            <option value="grains">Grains</option>
            <option value="dairy">Dairy</option>
            <option value="livestock">Livestock</option>
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
          <Button type="submit">Publish Product</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/farmer/products")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
