import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/auth-context";
import { adminService, type AdminFarmer } from "@/lib/services/admin-service";
import { formatProductUnitDisplay } from "@/lib/product-units";
import {
  productService,
  type Category,
  type Product,
  type ProductModerationStatus,
} from "@/lib/services/product-service";
import AdminProductFormDialog from "./AdminProductFormDialog";

type ModerationFilter = "all" | ProductModerationStatus;

type PendingModerationAction = {
  action: "hide" | "restore" | "remove";
  product: Product;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

const PAGE_SIZE = 10;

function getModerationBadgeClasses(status?: ProductModerationStatus): string {
  switch (status) {
    case "hidden":
      return "bg-amber-500/10 text-amber-700";
    case "removed":
      return "bg-destructive/10 text-destructive";
    case "active":
    default:
      return "bg-emerald-500/10 text-emerald-700";
  }
}

function formatModerationStatus(status?: ProductModerationStatus): string {
  switch (status) {
    case "hidden":
      return "Hidden";
    case "removed":
      return "Removed";
    case "active":
    default:
      return "Active";
  }
}

interface AdminProductManagementPanelProps {
  lockedFarmer?: AdminFarmer | null;
  onProductsChanged?: () => void;
}

export default function AdminProductManagementPanel({
  lockedFarmer = null,
  onProductsChanged,
}: AdminProductManagementPanelProps) {
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [farmers, setFarmers] = useState<AdminFarmer[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [farmerFilter, setFarmerFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ModerationFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingModerationAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isModerationSubmitting, setIsModerationSubmitting] = useState(false);

  const lockedFarmerUserId = lockedFarmer ? lockedFarmer.user_id || lockedFarmer.id : null;
  const canAddForLockedFarmer = !lockedFarmer || (lockedFarmer.status === "approved" && lockedFarmer.is_active);

  useEffect(() => {
    let active = true;
    productService
      .getCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((error) => {
        console.error("Failed to load categories", error);
      });

    if (!lockedFarmer) {
      adminService
        .getFarmers({ page: 1, page_size: 100 })
        .then((data) => {
          if (active) setFarmers(data.results);
        })
        .catch((error) => {
          console.error("Failed to load farmers", error);
        });
    }

    return () => {
      active = false;
    };
  }, [lockedFarmer]);

  useEffect(() => {
    setPage(1);
    setSearchInput("");
    setAppliedSearch("");
    setCategoryFilter("");
    setStatusFilter("all");
    setFarmerFilter("");
  }, [lockedFarmerUserId]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await productService.getProducts({
        available: "all",
        moderation_status: statusFilter,
        category: categoryFilter || undefined,
        farmer_id: lockedFarmerUserId ?? (farmerFilter ? Number(farmerFilter) : undefined),
        search: appliedSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      });

      if (Array.isArray(data)) {
        setProducts(data);
        setTotalCount(data.length);
        setHasNext(false);
        setHasPrevious(false);
      } else {
        setProducts(data.results);
        setTotalCount(data.count);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
      }
    } catch (error: unknown) {
      console.error("Failed to load admin products", error);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, categoryFilter, farmerFilter, lockedFarmerUserId, page, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setFarmerFilter("");
    setCategoryFilter("");
    setStatusFilter("all");
    setPage(1);
  };

  const openAddDialog = () => {
    setFormMode("add");
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setFormMode("edit");
    setEditingProduct(product);
    setFormOpen(true);
  };

  const openModerationAction = (action: "hide" | "restore" | "remove", product: Product) => {
    setActionReason("");
    if (action === "hide") {
      setPendingAction({
        action,
        product,
        title: `Hide "${product.name}"?`,
        description:
          "Hidden products are immediately removed from public marketplace listings, search, and customer checkout while preserving existing orders and reviews.",
        confirmLabel: "Hide Product",
      });
    } else if (action === "restore") {
      setPendingAction({
        action,
        product,
        title: `Restore "${product.name}"?`,
        description:
          "Restoring returns this product to active moderation status. It will appear publicly only if its stock is above zero and the farmer account is approved.",
        confirmLabel: "Restore Product",
      });
    } else {
      setPendingAction({
        action,
        product,
        title: `Safely remove "${product.name}"?`,
        description:
          "Safe removal permanently archives this listing from the marketplace and farmer catalog without deleting historical order items or customer reviews.",
        confirmLabel: "Remove Product",
        destructive: true,
      });
    }
  };

  const handleConfirmModeration = async () => {
    if (!pendingAction) return;
    setIsModerationSubmitting(true);
    try {
      const { action, product } = pendingAction;
      let updated: Product;
      if (action === "hide") {
        updated = await productService.hideProduct(product.slug, actionReason);
      } else if (action === "restore") {
        updated = await productService.restoreProduct(product.slug, actionReason);
      } else {
        updated = await productService.removeProduct(product.slug, actionReason);
      }

      toast({
        title:
          action === "hide"
            ? "Product hidden"
            : action === "restore"
              ? "Product restored"
              : "Product safely removed",
        description: `${updated.name} status is now ${formatModerationStatus(updated.moderation_status)}.`,
      });
      setPendingAction(null);
      setActionReason("");
      await fetchProducts();
      onProductsChanged?.();
    } catch (error: unknown) {
      toast({
        title: "Moderation action failed",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsModerationSubmitting(false);
    }
  };

  const renderActions = (product: Product, compactMobile = false) => {
    const modStatus = product.moderation_status || "active";
    const btnClass = compactMobile ? "flex-1 min-w-[96px]" : "";

    if (modStatus === "removed") {
      return (
        <span className="text-xs italic text-muted-foreground">
          Archived (orders & reviews preserved)
        </span>
      );
    }

    return (
      <div className={`flex flex-wrap gap-1.5 ${compactMobile ? "w-full" : "justify-end"}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          onClick={() => openEditDialog(product)}
          aria-label={`Edit ${product.name}`}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>

        {modStatus === "active" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`text-amber-700 ${btnClass}`}
            onClick={() => openModerationAction("hide", product)}
            aria-label={`Hide ${product.name}`}
          >
            <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Hide
          </Button>
        )}

        {modStatus === "hidden" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`text-primary ${btnClass}`}
            onClick={() => openModerationAction("restore", product)}
            aria-label={`Restore ${product.name}`}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`text-destructive hover:text-destructive ${btnClass}`}
          onClick={() => openModerationAction("remove", product)}
          aria-label={`Remove ${product.name}`}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasActiveFilters = Boolean(
    appliedSearch || categoryFilter || farmerFilter || statusFilter !== "all",
  );

  return (
    <div className="min-w-0 space-y-5">
      {/* Toolbar Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {lockedFarmer
            ? `Manage marketplace listings for ${lockedFarmer.farm_name}.`
            : "Add, edit, hide, restore, and safely archive farmer products across the platform."}
        </p>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <Button
            type="button"
            onClick={openAddDialog}
            disabled={!canAddForLockedFarmer}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
          {lockedFarmer && !canAddForLockedFarmer && (
            <span className="text-xs text-amber-700">
              Farmer must be approved before adding products.
            </span>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="admin-product-search" className="text-xs uppercase text-muted-foreground">
            Search Products
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-product-search"
              type="search"
              placeholder={
                lockedFarmer
                  ? "Search farmer products by name..."
                  : "Search by product, farmer, or farm name..."
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {!lockedFarmer && (
          <div className="space-y-1.5">
            <Label htmlFor="admin-product-farmer-filter" className="text-xs uppercase text-muted-foreground">
              Farmer
            </Label>
            <select
              id="admin-product-farmer-filter"
              value={farmerFilter}
              onChange={(e) => {
                setFarmerFilter(e.target.value);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-44"
            >
              <option value="">All Farmers</option>
              {farmers.map((f) => (
                <option key={f.id} value={String(f.user_id || f.id)}>
                  {f.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="admin-product-category-filter" className="text-xs uppercase text-muted-foreground">
            Category
          </Label>
          <select
            id="admin-product-category-filter"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-40"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="admin-product-status-filter" className="text-xs uppercase text-muted-foreground">
            Moderation
          </Label>
          <select
            id="admin-product-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ModerationFilter);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-36"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="removed">Removed</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="flex-1 sm:flex-none">
            Search
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={handleResetFilters}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Product List */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading products…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchProducts} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No products found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search or filter criteria."
              : "Use Add Product to create a listing."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile: Stacked cards (< 768px) */}
          <ul className="divide-y divide-border md:hidden">
            {products.map((product) => (
              <li key={product.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-12 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{product.name}</p>
                    {!lockedFarmer && (
                      <p className="truncate text-xs text-muted-foreground">{product.farmer_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {product.category_details?.name || "Uncategorized"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getModerationBadgeClasses(
                      product.moderation_status,
                    )}`}
                  >
                    {formatModerationStatus(product.moderation_status)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    ${Number(product.price).toFixed(2)}
                    {product.unit
                      ? ` / ${formatProductUnitDisplay(product.unit, product.unit_description)}`
                      : ""}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!product.unit && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                        No unit
                      </Badge>
                    )}
                    <Badge variant={product.stock > 0 ? "outline" : "secondary"}>
                      {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </Badge>
                  </div>
                </div>

                {product.moderation_reason && (
                  <p className="text-xs text-muted-foreground">
                    Note: {product.moderation_reason}
                  </p>
                )}

                <div className="pt-1">{renderActions(product, true)}</div>
              </li>
            ))}
          </ul>

          {/* Desktop: Table (>= 768px) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">Product</th>
                  {!lockedFarmer && <th className="px-6 py-3">Farmer</th>}
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Moderation</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{product.name}</p>
                          {product.moderation_reason && (
                            <p className="truncate text-xs text-muted-foreground">
                              {product.moderation_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {!lockedFarmer && (
                      <td className="px-6 py-3 text-muted-foreground">{product.farmer_name}</td>
                    )}
                    <td className="px-6 py-3 text-muted-foreground">
                      {product.category_details?.name || "Uncategorized"}
                    </td>
                    <td className="px-6 py-3 font-medium">
                      <div>
                        ${Number(product.price).toFixed(2)}
                        {product.unit
                          ? ` / ${formatProductUnitDisplay(product.unit, product.unit_description)}`
                          : ""}
                      </div>
                      {!product.unit && (
                        <span className="text-xs font-normal text-amber-700">No unit assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={product.stock > 0 ? "outline" : "secondary"}>
                        {product.stock > 0 ? `${product.stock}` : "0"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getModerationBadgeClasses(
                          product.moderation_status,
                        )}`}
                      >
                        {product.moderation_status === "active" && <Eye className="h-3 w-3" />}
                        {product.moderation_status === "hidden" && <EyeOff className="h-3 w-3" />}
                        {formatModerationStatus(product.moderation_status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">{renderActions(product, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Page {page} of {totalPages} · {totalCount} total product{totalCount === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrevious || page <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || page >= totalPages}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Dialog */}
      <AdminProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initialProduct={editingProduct}
        lockedFarmer={lockedFarmer}
        farmers={farmers}
        categories={categories}
        onSaved={async () => {
          await fetchProducts();
          onProductsChanged?.();
        }}
      />

      {/* Hide / Restore / Remove Confirmation Dialog */}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isModerationSubmitting) {
            setPendingAction(null);
            setActionReason("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pendingAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="product-moderation-reason" className="text-xs font-medium text-muted-foreground">
              Audit Note / Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="product-moderation-reason"
              type="text"
              maxLength={500}
              placeholder="e.g. Seasonal unavailability or policy check"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isModerationSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmModeration();
              }}
              disabled={isModerationSubmitting}
              className={
                pendingAction?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isModerationSubmitting ? "Updating…" : pendingAction?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
