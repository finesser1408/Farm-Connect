import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import AdminProductManagementPanel from "@/components/admin/AdminProductManagementPanel";
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
import {
  adminService,
  type AdminFarmer,
  type FarmerStatus,
} from "@/lib/services/admin-service";

type StatusFilter = "all" | FarmerStatus;

type PendingStatusAction = {
  action: "approve" | "suspend" | "reactivate";
  farmer: AdminFarmer;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

const PAGE_SIZE = 12;

const INITIAL_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  farm_name: "",
  location: "",
  description: "",
  password: "",
  password_confirm: "",
};

function getStatusBadgeClasses(status: FarmerStatus) {
  switch (status) {
    case "approved":
      return "bg-primary/10 text-primary";
    case "suspended":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function formatStatusLabel(status: FarmerStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminFarmers() {
  const { toast } = useToast();

  const [farmers, setFarmers] = useState<AdminFarmer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedFarmerForProducts, setSelectedFarmerForProducts] = useState<AdminFarmer | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingStatusAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchFarmers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.getFarmers({
        page,
        page_size: PAGE_SIZE,
        ...(appliedSearch ? { search: appliedSearch } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setFarmers(data.results);
      setTotalCount(data.count);
      setHasNext(Boolean(data.next));
      setHasPrevious(Boolean(data.previous));
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedSearch, statusFilter]);

  useEffect(() => {
    fetchFarmers();
  }, [fetchFarmers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const openStatusAction = (
    action: PendingStatusAction["action"],
    farmer: AdminFarmer,
  ) => {
    setActionReason("");
    if (action === "approve") {
      setPendingAction({
        action,
        farmer,
        title: "Approve Farmer Account",
        description: `Approve ${farmer.full_name} (${farmer.farm_name})? Their listings will become eligible for public marketplace display and purchase.`,
        confirmLabel: "Approve Farmer",
      });
    } else if (action === "suspend") {
      setPendingAction({
        action,
        farmer,
        title: "Suspend Farmer Account",
        description: `Suspend ${farmer.full_name} (${farmer.farm_name})? They will be blocked from creating or editing listings and their products will be hidden from public purchase while preserving historical orders.`,
        confirmLabel: "Suspend Farmer",
        destructive: true,
      });
    } else {
      setPendingAction({
        action,
        farmer,
        title: "Reactivate Farmer Account",
        description: `Reactivate ${farmer.full_name} (${farmer.farm_name})? Their approved farmer status will be restored without overriding product-specific moderation.`,
        confirmLabel: "Reactivate Farmer",
      });
    }
  };

  const handleConfirmStatusAction = async () => {
    if (!pendingAction) return;
    setIsActionSubmitting(true);
    try {
      let updated: AdminFarmer;
      if (pendingAction.action === "approve") {
        updated = await adminService.approveFarmer(pendingAction.farmer.id, actionReason);
      } else if (pendingAction.action === "suspend") {
        updated = await adminService.suspendFarmer(pendingAction.farmer.id, actionReason);
      } else {
        updated = await adminService.reactivateFarmer(pendingAction.farmer.id, actionReason);
      }

      setFarmers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast({
        title: `Farmer ${updated.status}`,
        description: `${updated.full_name} is now ${updated.status}.`,
      });
      setPendingAction(null);
      setActionReason("");
      await fetchFarmers();
    } catch (error: unknown) {
      toast({
        title: "Action failed",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleCreateFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    if (!form.farm_name.trim() || !form.location.trim()) {
      setFormError("Farm name and public location are required.");
      return;
    }
    if (form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.password_confirm) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await adminService.createFarmer({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        farm_name: form.farm_name.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      });

      toast({
        title: "Farmer registered",
        description: `${created.full_name} (${created.farm_name}) was created with Pending status.`,
      });
      setIsAddOpen(false);
      setForm(INITIAL_FORM);
      setPage(1);
      await fetchFarmers();
    } catch (error: unknown) {
      const message = getAuthErrorMessage(error);
      setFormError(message);
      toast({
        title: "Registration failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const renderActions = (farmer: AdminFarmer, compactMobile = false) => {
    const btnClass = compactMobile ? "flex-1 min-w-[115px]" : "";

    return (
      <div className={`flex flex-wrap gap-2 ${compactMobile ? "w-full" : "justify-end"}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={btnClass}
          onClick={() => setSelectedFarmerForProducts(farmer)}
          aria-label={`View products for ${farmer.full_name}`}
        >
          <Package className="mr-1.5 h-3.5 w-3.5" /> View Products
        </Button>

        {farmer.status === "pending" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`text-primary ${btnClass}`}
            onClick={() => openStatusAction("approve", farmer)}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
          </Button>
        )}

        {(farmer.status === "pending" || farmer.status === "approved") && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`text-destructive hover:text-destructive ${btnClass}`}
            onClick={() => openStatusAction("suspend", farmer)}
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" /> Suspend
          </Button>
        )}

        {farmer.status === "suspended" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`text-primary ${btnClass}`}
            onClick={() => openStatusAction("reactivate", farmer)}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reactivate
          </Button>
        )}
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasActiveFilters = Boolean(appliedSearch || statusFilter !== "all");

  if (selectedFarmerForProducts) {
    return (
      <div className="min-w-0 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1 gap-1.5 text-muted-foreground"
              onClick={() => setSelectedFarmerForProducts(null)}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Farmers
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl text-foreground">
                {selectedFarmerForProducts.full_name} — Products
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(
                  selectedFarmerForProducts.status,
                )}`}
              >
                {formatStatusLabel(selectedFarmerForProducts.status)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedFarmerForProducts.farm_name} · {selectedFarmerForProducts.email}
            </p>
          </div>
        </div>

        <AdminProductManagementPanel
          lockedFarmer={selectedFarmerForProducts}
          onProductsChanged={fetchFarmers}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">Farmer Management</h1>
          <p className="text-sm text-muted-foreground">
            Register, approve, suspend, and reactivate producer accounts.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setForm(INITIAL_FORM);
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="w-full gap-1.5 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Add Farmer
        </Button>
      </div>

      {/* Search & Status Filter */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="farmer-search" className="text-xs uppercase text-muted-foreground">
            Search Farmers
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="farmer-search"
              type="search"
              placeholder="Search by name, email, farm name, or location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="farmer-status-filter" className="text-xs uppercase text-muted-foreground">
            Status
          </Label>
          <select
            id="farmer-status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-44"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
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

      {/* Farmer List */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading farmers…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchFarmers} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : farmers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No farmer accounts found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search or status filter."
              : "Use Add Farmer to register a new producer account."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile: Stacked cards (< 768px) */}
          <ul className="divide-y divide-border md:hidden">
            {farmers.map((f) => (
              <li key={f.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{f.full_name}</p>
                    <p className="truncate text-xs text-foreground/80">{f.farm_name}</p>
                    <p className="break-all text-xs text-muted-foreground">{f.email}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(
                      f.status,
                    )}`}
                  >
                    {formatStatusLabel(f.status)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {f.location || "Location not set"}
                  </span>
                  <Badge variant="outline">
                    {f.product_count} product{f.product_count === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="pt-1">{renderActions(f, true)}</div>
              </li>
            ))}
          </ul>

          {/* Desktop: Table (>= 768px) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">Farmer</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Products</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {farmers.map((f) => (
                  <tr key={f.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground">{f.full_name}</p>
                      <p className="text-xs text-muted-foreground">{f.farm_name}</p>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{f.email}</td>
                    <td className="px-6 py-3 text-muted-foreground">{f.location || "—"}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClasses(
                          f.status,
                        )}`}
                      >
                        {formatStatusLabel(f.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3">{f.product_count}</td>
                    <td className="px-6 py-3 text-right">{renderActions(f, false)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Page {page} of {totalPages} · {totalCount} total farmer{totalCount === 1 ? "" : "s"}
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
                disabled={!hasNext}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Farmer Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!isCreating) setIsAddOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Farmer</DialogTitle>
            <DialogDescription>
              Create a new producer account. New accounts start as Pending until approved.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFarmer} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-first-name">First Name *</Label>
                <Input
                  id="add-farmer-first-name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-last-name">Last Name *</Label>
                <Input
                  id="add-farmer-last-name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-email">Email *</Label>
                <Input
                  id="add-farmer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-phone">Phone</Label>
                <Input
                  id="add-farmer-phone"
                  maxLength={13}
                  placeholder="+263771234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-farm-name">Farm Name *</Label>
                <Input
                  id="add-farmer-farm-name"
                  value={form.farm_name}
                  onChange={(e) => setForm({ ...form, farm_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-location">Public Location (City/Town) *</Label>
                <Input
                  id="add-farmer-location"
                  placeholder="e.g. Harare"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-farmer-description">Farm Description</Label>
              <Textarea
                id="add-farmer-description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief overview of produce grown..."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-password">Initial Password *</Label>
                <Input
                  id="add-farmer-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-farmer-password-confirm">Confirm Password *</Label>
                <Input
                  id="add-farmer-password-confirm"
                  type="password"
                  minLength={8}
                  value={form.password_confirm}
                  onChange={(e) => setForm({ ...form, password_confirm: e.target.value })}
                  required
                />
              </div>
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
                onClick={() => setIsAddOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Registering…" : "Register Farmer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve / Suspend / Reactivate Confirmation Dialog */}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isActionSubmitting) {
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
            <Label htmlFor="farmer-action-reason" className="text-xs font-medium text-muted-foreground">
              Audit Note / Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="farmer-action-reason"
              type="text"
              maxLength={500}
              placeholder="e.g. Verified farm registration"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActionSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmStatusAction();
              }}
              disabled={isActionSubmitting}
              className={
                pendingAction?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isActionSubmitting ? "Updating…" : pendingAction?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
