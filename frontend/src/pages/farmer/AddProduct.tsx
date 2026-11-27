import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";
import {
  COUNTABLE_SELLING_UNITS,
  WEIGHT_AND_VOLUME_UNITS,
  formatProductUnitDisplay,
  getSellingUnitOption,
  isContinuousSellingUnit,
  isPackagedUnitRequiringDescription,
  validateProductListingForm,
} from "@/lib/product-units";
import { productService, type Category } from "@/lib/services/product-service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AddProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [formError, setFormError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    unit_description: "",
    price: "",
    quantity: "",
    min_order_quantity: "1",
    description: "",
  });

  useEffect(() => {
    let active = true;
    productService
      .getCategories()
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

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFormError("");
      if (k === "unit") {
        const nextUnit = e.target.value;
        setForm({
          ...form,
          unit: nextUnit,
          unit_description: isContinuousSellingUnit(nextUnit) ? "" : form.unit_description,
        });
        return;
      }
      setForm({ ...form, [k]: e.target.value });
    };

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

  const selectedUnitOption = getSellingUnitOption(form.unit);
  const isContinuous = isContinuousSellingUnit(form.unit);
  const requiresPackageDescription = isPackagedUnitRequiringDescription(form.unit);
  const formattedUnit = formatProductUnitDisplay(form.unit, form.unit_description);
  const selectedCategoryName =
    categories.find((c) => String(c.id) === String(form.category))?.name || "Uncategorized";

  const validateCurrentForm = (): boolean => {
    setFormError("");
    const errorMessage = validateProductListingForm({
      name: form.name,
      category: form.category,
      requireCategory: true,
      unit: form.unit,
      unit_description: form.unit_description,
      price: form.price,
      stock: form.quantity,
      min_order_quantity: form.min_order_quantity,
      description: form.description,
    });
    if (errorMessage) {
      setFormError(errorMessage);
      return false;
    }
    return true;
  };

  const handleOpenPreview = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCurrentForm()) return;
    setPreviewOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!user) return;
    if (!validateCurrentForm()) return;

    setIsSubmitting(true);
    try {
      const productData = new FormData();
      productData.append("name", form.name.trim());
      productData.append("price", Number(form.price).toFixed(2));
      productData.append("stock", form.quantity.trim());
      productData.append("unit", form.unit);
      productData.append("unit_description", form.unit_description.trim());
      productData.append("min_order_quantity", form.min_order_quantity.trim());
      productData.append("description", form.description.trim());
      productData.append("category", form.category);
      if (imageFile) productData.append("image", imageFile);
      await productService.createProduct(productData);
      await queryClient.invalidateQueries({ queryKey: ["products"] });

      setPreviewOpen(false);
      toast({
        title: "Product published!",
        description: `${form.name.trim()} is now live on the marketplace.`,
      });
      navigate("/farmer/products");
    } catch (error: unknown) {
      console.error("Failed to add product", error);
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: "Failed to publish",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <h1 className="mb-6 font-display text-2xl text-foreground">Add New Product</h1>
      <form
        onSubmit={handleOpenPreview}
        noValidate
        className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6"
      >
        <div>
          <Label htmlFor="pname">Product Name</Label>
          <Input
            id="pname"
            placeholder="Organic Tomatoes"
            value={form.name}
            onChange={set("name")}
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={form.category}
            onChange={set("category")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={categories.length === 0}
          >
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categoryError && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {categoryError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <div>
            <Label htmlFor="unit">Selling Unit</Label>
            <select
              id="unit"
              value={form.unit}
              onChange={set("unit")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              <option value="">Select a selling unit</option>
              <optgroup label="Weight & Volume (Decimals allowed)">
                {WEIGHT_AND_VOLUME_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Countable (Whole numbers)">
                {COUNTABLE_SELLING_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedUnitOption
                ? selectedUnitOption.isCountable
                  ? "Whole numbers only for this unit."
                  : "Fractional quantities (e.g. 0.5) supported."
                : "Choose how customers buy this product."}
            </p>
          </div>

          <div>
            <Label htmlFor="unit-description">
              Package Size / Details {requiresPackageDescription ? "*" : isContinuous ? "(not used)" : "(optional)"}
            </Label>
            <Input
              id="unit-description"
              maxLength={40}
              disabled={isContinuous}
              placeholder={
                isContinuous
                  ? "Not used for kg or L listings"
                  : selectedUnitOption?.packagePlaceholder || "e.g. 10 kg, 50 kg, 30 eggs, 20 L"
              }
              value={form.unit_description}
              onChange={set("unit_description")}
              required={requiresPackageDescription}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {isContinuous
                ? "Continuous units (kg, L) do not use separate package descriptions."
                : requiresPackageDescription
                  ? `Required for ${selectedUnitOption?.label} listings (e.g. 10 kg, 20 L, 30 eggs).`
                  : "Optional size details (max 40 characters)."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="price">Price per Unit ($)</Label>
            <Input
              id="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder={selectedUnitOption?.examplePrice || "1.50"}
              value={form.price}
              onChange={set("price")}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formattedUnit && form.price && Number(form.price) > 0
                ? `$${Number(form.price).toFixed(2)} per ${formattedUnit}`
                : "e.g. $1.50 per kg or $8.00 per bag (10 kg)"}
            </p>
          </div>

          <div>
            <Label htmlFor="qty">Available Stock</Label>
            <Input
              id="qty"
              type="number"
              inputMode={isContinuous ? "decimal" : "numeric"}
              min="0"
              step={isContinuous ? "0.01" : "1"}
              placeholder={selectedUnitOption?.exampleStock || "50"}
              value={form.quantity}
              onChange={set("quantity")}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formattedUnit
                ? `e.g. ${selectedUnitOption?.exampleStock || "50"} ${formattedUnit}`
                : "e.g. 50 kg, 20 bags, 12 trays"}
            </p>
          </div>

          <div>
            <Label htmlFor="min-order-qty">Minimum Order Quantity</Label>
            <Input
              id="min-order-qty"
              type="number"
              inputMode={isContinuous ? "decimal" : "numeric"}
              min={isContinuous ? "0.01" : "1"}
              step={isContinuous ? "0.01" : "1"}
              placeholder={selectedUnitOption?.exampleMinOrder || "1"}
              value={form.min_order_quantity}
              onChange={set("min_order_quantity")}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {formattedUnit
                ? `e.g. ${selectedUnitOption?.exampleMinOrder || "1"} ${formattedUnit}`
                : "e.g. 0.5 kg or 1 tray"}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Product Description</Label>
          <textarea
            id="desc"
            rows={4}
            placeholder="Describe your product..."
            value={form.description}
            onChange={set("description")}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <Label htmlFor="image">Product image (JPEG, PNG, or WebP; up to 5 MB)</Label>
          <Input
            id="image"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            className="h-auto py-2 file:mr-3"
          />
          {imageError && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {imageError}
            </p>
          )}
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Product image preview"
              className="mt-3 h-40 w-40 max-w-full rounded-md object-cover"
            />
          )}
        </div>

        {formError && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {formError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? "Publishing..." : "Publish Product"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenPreview()}
            disabled={isSubmitting}
            className="w-full gap-1.5 sm:w-auto"
          >
            <Eye className="h-4 w-4" /> Preview Listing
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/farmer/products")}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Lightweight Product Preview & Publication Confirmation Dialog */}
      <Dialog open={previewOpen} onOpenChange={(nextOpen) => !isSubmitting && setPreviewOpen(nextOpen)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Product Listing</DialogTitle>
            <DialogDescription>
              Review how your product listing will appear to customers before confirming publication.
            </DialogDescription>
          </DialogHeader>

          <div
            data-testid="product-preview-card"
            className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={form.name || "Product preview"}
                className="h-44 w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-36 w-full flex-col items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Package className="mb-1 h-8 w-8 opacity-50" />
                <span className="text-xs">No image selected</span>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {selectedCategoryName}
              </p>
              <h3 className="font-display text-lg font-semibold text-foreground">
                {form.name.trim()}
              </h3>
              <p className="text-base font-bold text-primary">
                ${Number(form.price || 0).toFixed(2)}
                {formattedUnit ? ` / ${formattedUnit}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {form.quantity.trim()} {formattedUnit} available
              </span>
              <span>
                Minimum order: {form.min_order_quantity.trim()} {formattedUnit}
              </span>
            </div>

            {form.description.trim() && (
              <p className="border-t border-border pt-2 text-sm text-foreground">
                {form.description.trim()}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={isSubmitting}
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPublish}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publishing..." : "Confirm & Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
