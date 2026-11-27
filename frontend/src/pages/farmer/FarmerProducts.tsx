import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { getImageUrl } from "@/lib/api-client";
import {
  COUNTABLE_SELLING_UNITS,
  WEIGHT_AND_VOLUME_UNITS,
  formatProductUnitDisplay,
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

type EditFormState = {
  name: string;
  category: string;
  unit: string;
  unit_description: string;
  price: string;
  stock: string;
  min_order_quantity: string;
  description: string;
};

export default function FarmerProducts() {
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    category: "",
    unit: "",
    unit_description: "",
    price: "",
    stock: "",
    min_order_quantity: "1",
    description: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [awaitingUnitChangeConfirm, setAwaitingUnitChangeConfirm] = useState(false);

  const loadProducts = () =>
    productService
      .getProducts({ farmer: "me" })
      .then((data) => setProducts(Array.isArray(data) ? data : data.results));

  useEffect(() => {
    let active = true;
    Promise.all([loadProducts(), productService.getCategories().catch(() => [] as Category[])])
      .then(([, loadedCategories]) => {
        if (active && loadedCategories) {
          setCategories(loadedCategories);
        }
      })
      .catch((error) => {
        console.error("Could not load farmer products", error);
        toast({
          title: "Error",
          description: "Could not load your products.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      category: product.category ? String(product.category) : "",
      unit: product.unit ?? "",
      unit_description: product.unit_description ?? "",
      price: String(product.price),
      stock: String(product.stock),
      min_order_quantity: String(product.min_order_quantity ?? 1),
      description: product.description ?? "",
    });
    setImageFile(null);
    setImageError("");
    setFormError("");
    setAwaitingUnitChangeConfirm(false);
  };

  const closeEditDialog = () => {
    if (isSaving) return;
    setEditingProduct(null);
    setImageFile(null);
    setImageError("");
    setFormError("");
    setAwaitingUnitChangeConfirm(false);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const hasUnitOrPackageChanged = (product: Product): boolean => {
    const prevUnit = product.unit ?? "";
    const prevDesc = (product.unit_description ?? "").trim();
    const nextUnit = editForm.unit;
    const nextDesc = editForm.unit_description.trim();
    if (!prevUnit) {
      return false;
    }
    return prevUnit !== nextUnit || prevDesc !== nextDesc;
  };

  const submitProductUpdate = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    setFormError("");
    try {
      const payload = new FormData();
      payload.append("name", editForm.name.trim());
      payload.append("price", Number(editForm.price).toFixed(2));
      payload.append("stock", editForm.stock.trim());
      payload.append("unit", editForm.unit);
      payload.append("unit_description", editForm.unit_description.trim());
      payload.append("min_order_quantity", editForm.min_order_quantity.trim());
      payload.append("description", editForm.description.trim());
      if (editForm.category) {
        payload.append("category", editForm.category);
      }
      if (imageFile) {
        payload.append("image", imageFile);
      }

      const updated = await productService.updateProduct(editingProduct.slug, payload);
      setProducts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product updated",
        description: `${updated.name} has been saved.`,
      });
      setEditingProduct(null);
      setAwaitingUnitChangeConfirm(false);
    } catch (error: unknown) {
      console.error("Failed to update product", error);
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setFormError("");

    const validationError = validateProductListingForm({
      name: editForm.name,
      category: editForm.category,
      requireCategory: false,
      unit: editForm.unit,
      unit_description: editForm.unit_description,
      price: editForm.price,
      stock: editForm.stock,
      min_order_quantity: editForm.min_order_quantity,
      description: editForm.description,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!awaitingUnitChangeConfirm && hasUnitOrPackageChanged(editingProduct)) {
      setAwaitingUnitChangeConfirm(true);
      return;
    }

    await submitProductUpdate();
  };

  const removeProduct = async (product: Product) => {
    try {
      await productService.deleteProduct(product.slug);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product removed" });
    } catch (error) {
      console.error("Could not remove product", error);
      toast({
        title: "Error",
        description: "Could not remove this product.",
        variant: "destructive",
      });
    }
  };

  const selectedUnitOption = getSellingUnitOption(editForm.unit);
  const isContinuous = isContinuousSellingUnit(editForm.unit);
  const requiresPackageDescription = isPackagedUnitRequiringDescription(editForm.unit);
  const formattedEditUnit = formatProductUnitDisplay(editForm.unit, editForm.unit_description);
  const isLegacyUnitlessProduct = Boolean(editingProduct && !editingProduct.unit);

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-foreground">My Products</h1>
        <Link to="/farmer/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <p>Loading products…</p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground">You have not listed any products yet.</p>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile: stacked cards */}
          <ul className="divide-y divide-border md:hidden">
            {products.map((product) => {
              const unitLabel = formatProductUnitDisplay(product.unit, product.unit_description);
              return (
                <li key={product.id} className="flex items-center gap-3 p-3">
                  <img
                    src={product.image ? getImageUrl(product.image) : "/placeholder.svg"}
                    alt={product.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-md bg-muted object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium text-foreground">{product.name}</p>
                      {!product.unit && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                          No unit assigned
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.category_details?.name || "Uncategorized"}
                    </p>
                    <p className="text-sm">
                      ${Number(product.price).toFixed(2)}
                      {unitLabel ? ` / ${unitLabel}` : ""} ·{" "}
                      <span className="text-muted-foreground">
                        Stock {product.stock}
                        {unitLabel ? ` ${unitLabel}` : ""}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(product)}
                      aria-label={`Edit ${product.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => removeProduct(product)}
                      aria-label={`Remove ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Tablet/desktop: table */}
          <div className="hidden overflow-x-auto md:block">
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
                {products.map((product) => {
                  const unitLabel = formatProductUnitDisplay(
                    product.unit,
                    product.unit_description,
                  );
                  return (
                    <tr key={product.id}>
                      <td className="px-6 py-3 font-medium text-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{product.name}</span>
                          {!product.unit && (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                              No unit assigned
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {product.category_details?.name || "Uncategorized"}
                      </td>
                      <td className="px-6 py-3">
                        ${Number(product.price).toFixed(2)}
                        {unitLabel ? ` / ${unitLabel}` : ""}
                      </td>
                      <td className="px-6 py-3">
                        {product.stock}
                        {unitLabel ? ` ${unitLabel}` : ""}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeProduct(product)}
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Farmer Edit Product Dialog */}
      <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product — {editingProduct?.name}</DialogTitle>
            <DialogDescription>
              Update your product listing details, selling unit, package size, pricing, or stock.
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
                  This product has no defined selling unit. Please select an accurate selling unit
                  (and package size if applicable) before saving and republishing.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleEditFormSubmit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="edit-pname">Product Name</Label>
              <Input
                id="edit-pname"
                value={editForm.name}
                onChange={(e) => {
                  setFormError("");
                  setEditForm({ ...editForm, name: e.target.value });
                }}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editForm.category}
                onChange={(e) => {
                  setFormError("");
                  setEditForm({ ...editForm, category: e.target.value });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-unit">Selling Unit</Label>
                <select
                  id="edit-unit"
                  value={editForm.unit}
                  onChange={(e) => {
                    setFormError("");
                    setAwaitingUnitChangeConfirm(false);
                    const nextUnit = e.target.value;
                    setEditForm({
                      ...editForm,
                      unit: nextUnit,
                      unit_description: isContinuousSellingUnit(nextUnit)
                        ? ""
                        : editForm.unit_description,
                    });
                  }}
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
              </div>

              <div>
                <Label htmlFor="edit-unit-description">
                  Package Size / Details{" "}
                  {requiresPackageDescription ? "*" : isContinuous ? "(not used)" : "(optional)"}
                </Label>
                <Input
                  id="edit-unit-description"
                  maxLength={40}
                  disabled={isContinuous}
                  placeholder={
                    isContinuous
                      ? "Not used for kg or L listings"
                      : selectedUnitOption?.packagePlaceholder || "e.g. 10 kg, 50 kg, 30 eggs, 20 L"
                  }
                  value={editForm.unit_description}
                  onChange={(e) => {
                    setFormError("");
                    setAwaitingUnitChangeConfirm(false);
                    setEditForm({ ...editForm, unit_description: e.target.value });
                  }}
                  required={requiresPackageDescription}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="edit-price">Price per Unit ($)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={editForm.price}
                  onChange={(e) => {
                    setFormError("");
                    setEditForm({ ...editForm, price: e.target.value });
                  }}
                  required
                />
                {formattedEditUnit && editForm.price && Number(editForm.price) > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    ${Number(editForm.price).toFixed(2)} per {formattedEditUnit}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="edit-stock">Available Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  inputMode={isContinuous ? "decimal" : "numeric"}
                  min="0"
                  step={isContinuous ? "0.01" : "1"}
                  value={editForm.stock}
                  onChange={(e) => {
                    setFormError("");
                    setEditForm({ ...editForm, stock: e.target.value });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-min-order">Minimum Order Quantity</Label>
                <Input
                  id="edit-min-order"
                  type="number"
                  inputMode={isContinuous ? "decimal" : "numeric"}
                  min={isContinuous ? "0.01" : "1"}
                  step={isContinuous ? "0.01" : "1"}
                  value={editForm.min_order_quantity}
                  onChange={(e) => {
                    setFormError("");
                    setEditForm({ ...editForm, min_order_quantity: e.target.value });
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Product Description</Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={(e) => {
                  setFormError("");
                  setEditForm({ ...editForm, description: e.target.value });
                }}
              />
            </div>

            <div>
              <Label htmlFor="edit-image">Replace Product Image (optional)</Label>
              <Input
                id="edit-image"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleEditImageChange}
              />
              {imageError && (
                <p className="mt-1 text-xs text-destructive" role="alert">
                  {imageError}
                </p>
              )}
              {(imagePreview || editingProduct?.image) && (
                <img
                  src={
                    imagePreview ||
                    (editingProduct?.image ? getImageUrl(editingProduct.image) : "/placeholder.svg")
                  }
                  alt={editForm.name || "Product preview"}
                  className="mt-2 h-24 w-24 rounded-md object-cover"
                />
              )}
            </div>

            {awaitingUnitChangeConfirm && (
              <div
                role="alert"
                className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900"
              >
                <p className="font-semibold">Confirm Selling Unit or Package Size Change</p>
                <p>
                  You changed this product&apos;s selling unit or package size. Customers who
                  already have this item in their active carts will not have their carts deleted,
                  but may need to update their cart quantities before checking out.
                </p>
              </div>
            )}

            {formError && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {formError}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditDialog}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : awaitingUnitChangeConfirm
                    ? "Confirm Unit Change & Save"
                    : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
