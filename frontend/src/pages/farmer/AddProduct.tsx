import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";
import { productService, Category } from "@/lib/services/product-service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AddProduct() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({ name: "", category: "", price: "", quantity: "", description: "" });
  
  useEffect(() => {
    let active = true;
    productService.getCategories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch(() => {
        if (active) setCategoryError("Unable to load product categories. Please try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageError("");
    if (!file) {
      setImageFile(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const supportedExtension = ["jpg", "jpeg", "png", "webp"].includes(extension ?? "");
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type) || !supportedExtension) {
      setImageFile(null);
      setImageError("Choose a JPEG, PNG, or WebP image.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);
      setImageError("Image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const productData = new FormData();
      productData.append("name", form.name);
      productData.append("price", form.price);
      productData.append("stock", form.quantity);
      productData.append("description", form.description);
      productData.append("category", form.category);
      if (imageFile) productData.append("image", imageFile);
      await productService.createProduct(productData);
      
      toast({ title: "Product published!", description: `${form.name} is now live on the marketplace.` });
      navigate("/farmer/products");
    } catch (error: unknown) {
      console.error("Failed to add product", error);
      toast({ 
        title: "Failed to publish", 
        description: getAuthErrorMessage(error),
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
          <select id="category" value={form.category} onChange={set("category")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" required disabled={categories.length === 0}>
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categoryError && <p className="mt-1 text-sm text-destructive" role="alert">{categoryError}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="price">Price ($)</Label><Input id="price" type="number" step="0.01" placeholder="3.50" value={form.price} onChange={set("price")} required /></div>
          <div><Label htmlFor="qty">Quantity</Label><Input id="qty" type="number" placeholder="50" value={form.quantity} onChange={set("quantity")} required /></div>
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" rows={4} placeholder="Describe your product..." value={form.description} onChange={set("description")} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <div>
          <Label htmlFor="image">Product image (JPEG, PNG, or WebP; up to 5 MB)</Label>
          <Input id="image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImageChange} />
          {imageError && <p className="mt-1 text-sm text-destructive" role="alert">{imageError}</p>}
          {imagePreview && <img src={imagePreview} alt="Product image preview" className="mt-3 h-40 w-40 rounded-md object-cover" />}
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing..." : "Publish Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/farmer/products")} disabled={isSubmitting}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
