import { useEffect, useState } from "react";
import { AlertTriangle, Image as ImageIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/auth-context";
import type { AdminFarmer } from "@/lib/services/admin-service";
import {
  COUNTABLE_SELLING_UNITS,
  WEIGHT_AND_VOLUME_UNITS,
  getSellingUnitOption,
  isContinuousSellingUnit,
  isPackagedUnitRequiringDescription,
  validateProductListingForm,
} from "@/lib/product-units";
import {
  productService,
  type Category,
  type Product,
} from "@/lib/services/product-service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type FormState = {
  farmer_id: string;
  name: string;
  category: string;
  unit: string;
  unit_description: string;
  price: string;
  stock: string;
  min_order_quantity: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  farmer_id: "",
  name: "",
  category: "",
  unit: "kg",
  unit_description: "",
  price: "",
  stock: "",
  min_order_quantity: "1",
  description: "",
};

interface AdminProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  initialProduct?: Product | null;
  lockedFarmer?: AdminFarmer | null;
  farmers?: AdminFarmer[];
  categories: Category[];
  onSaved: (product: Product, mode: "add" | "edit") => void | Promise<void>;
}

export default function AdminProductFormDialog({
  open,
  onOpenChange,
  mode,
  initialProduct = null,
  lockedFarmer = null,
  farmers = [],
  categories,
  onSaved,
}: AdminProductFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedFarmers = farmers.filter(
    (farmer) => farmer.status === "approved" && farmer.is_active,
  );

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setImageError("");
    setImageFile(null);

    if (mode === "edit" && initialProduct) {
      setForm({
        farmer_id: String(initialProduct.farmer_id ?? lockedFarmer?.user_id ?? ""),
        name: initialProduct.name,
        category: initialProduct.category ? String(initialProduct.category) : "",
        unit: initialProduct.unit ?? "",
        unit_description: initialProduct.unit_description ?? "",
        price: String(initialProduct.price),
        stock: String(initialProduct.stock),
        min_order_quantity: String(initialProduct.min_order_quantity ?? 1),
        description: initialProduct.description,
      });
    } else {
      const defaultFarmerId = lockedFarmer
        ? String(lockedFarmer.user_id || lockedFarmer.id)
        : approvedFarmers.length === 1
          ? String(approvedFarmers[0].user_id || approvedFarmers[0].id)
          : "";
      setForm({
        ...EMPTY_FORM,
        farmer_id: defaultFarmerId,
        category: categories[0] ? String(categories[0].id) : "",
      });
    }
  }, [open, mode, initialProduct, lockedFarmer, categories]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageError("");
    if (!file) {
      setImageFile(null);
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExt = ["jpg", "jpeg", "png", "webp"].includes(ext ?? "");
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type) || !validExt) {
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
    setFormError(null);

    if (mode === "add" && !form.farmer_id) {
      setFormError("Select an approved farmer for this product.");
      return;
    }

    const validationError = validateProductListingForm({
      name: form.name,
      category: form.category,
      requireCategory: false,
      unit: form.unit,
      unit_description: form.unit_description,
      price: form.price,
      stock: form.stock,
      min_order_quantity: form.min_order_quantity,
      description: form.description,
      requireDescription: true,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      if (mode === "add") {
        payload.append("farmer_id", form.farmer_id);
      }
      payload.append("name", form.name.trim());
      payload.append("price", Number(form.price).toFixed(2));
      payload.append("stock", form.stock.trim());
      payload.append("unit", form.unit);
      payload.append("unit_description", form.unit_description.trim());
      payload.append("min_order_quantity", form.min_order_quantity.trim());
      payload.append("description", form.description.trim());
      if (form.category) {
        payload.append("category", form.category);
      }
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const saved =
        mode === "edit" && initialProduct
          ? await productService.updateProduct(initialProduct.slug, payload)
          : await productService.createProduct(payload);

      toast({
        title: mode === "edit" ? "Product updated" : "Product created",
        description: `${saved.name} has been saved.`,
      });
      await onSaved(saved, mode);
      onOpenChange(false);
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: mode === "edit" ? "Update failed" : "Creation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingImage = mode === "edit" ? initialProduct?.image : null;
  const activePreview = imagePreview || existingImage || "";
  const selectedUnitOption = getSellingUnitOption(form.unit);
  const isContinuous = isContinuousSellingUnit(form.unit);
  const requiresPackageDescription = isPackagedUnitRequiringDescription(form.unit);
  const isLegacyUnitlessProduct = mode === "edit" && Boolean(initialProduct && !initialProduct.unit);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isSubmitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? `Edit Product — ${initialProduct?.name}` : "Add Farmer Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update pricing, selling unit, stock, category details, or upload a replacement product photo."
              : "Create a marketplace listing linked to an approved farmer account."}
          </DialogDescription>
        </DialogHeader>

        {isLegacyUnitlessProduct && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">Legacy Product Without Selling Unit</p>
              <p className="mt-0.5">
                This legacy listing has no selling unit defined. Select an accurate selling unit
                before saving changes.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "add" && !lockedFarmer ? (
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-farmer">Approved Farmer *</Label>
              <select
                id="admin-product-farmer"
                value={form.farmer_id}
                onChange={(e) => setForm({ ...form, farmer_id: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select an approved farmer…</option>
                {approvedFarmers.map((farmer) => (
                  <option key={farmer.id} value={String(farmer.user_id || farmer.id)}>
                    {farmer.full_name} — {farmer.farm_name} ({farmer.location || "No location"})
                  </option>
                ))}
              </select>
              {approvedFarmers.length === 0 && (
                <p className="text-xs text-amber-700">
                  No approved active farmers available. Approve a farmer before adding products.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Farmer:{" "}
              <span className="font-medium text-foreground">
                {lockedFarmer
                  ? `${lockedFarmer.full_name} (${lockedFarmer.farm_name})`
                  : initialProduct?.farmer_name}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-name">Product Name *</Label>
              <Input
                id="admin-product-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Organic Heirloom Tomatoes"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-product-category">Category</Label>
              <select
                id="admin-product-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-unit">Selling Unit *</Label>
              <select
                id="admin-product-unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-product-unit-description">
                Package Size / Details {requiresPackageDescription ? "*" : "(optional)"}
              </Label>
              <Input
                id="admin-product-unit-description"
                maxLength={40}
                placeholder={
                  selectedUnitOption?.packagePlaceholder || "e.g. 10 kg, 30 eggs, 20 L"
                }
                value={form.unit_description}
                onChange={(e) => setForm({ ...form, unit_description: e.target.value })}
                required={requiresPackageDescription}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-price">Price per Unit ($) *</Label>
              <Input
                id="admin-product-price"
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-stock">Available Stock *</Label>
              <Input
                id="admin-product-stock"
                type="number"
                step={isContinuous ? "0.01" : "1"}
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-product-min-order">Minimum Order *</Label>
              <Input
                id="admin-product-min-order"
                type="number"
                step={isContinuous ? "0.01" : "1"}
                min={isContinuous ? "0.01" : "1"}
                value={form.min_order_quantity}
                onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-product-description">Description *</Label>
            <Textarea
              id="admin-product-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe freshness, unit size, or harvest notes..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-product-image">
              {mode === "edit" ? "Replace Product Image (optional)" : "Product Image (optional)"}
            </Label>
            <Input
              id="admin-product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 5 MB.</p>
            {imageError && (
              <p role="alert" className="text-xs text-destructive">
                {imageError}
              </p>
            )}
            {activePreview ? (
              <div className="flex items-center gap-3 rounded-md border border-border p-2">
                <img
                  src={activePreview}
                  alt={form.name || "Product preview"}
                  className="h-14 w-14 rounded object-cover"
                />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {imagePreview ? "New replacement image ready to upload." : "Current product photo."}
                </div>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageFile(null)}
                  >
                    Undo
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4" /> No product image selected.
              </div>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (mode === "add" && !lockedFarmer && approvedFarmers.length === 0)}
            >
              {isSubmitting ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
