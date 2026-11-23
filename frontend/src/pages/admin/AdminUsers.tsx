import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldOff,
  UserCog,
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
import { getAuthErrorMessage, useAuth } from "@/lib/auth-context";
import {
  adminService,
  type AdminUser,
  type AdminUserQueryParams,
  type AssignableUserRole,
} from "@/lib/services/admin-service";

type RoleFilter = "all" | NonNullable<AdminUserQueryParams["role"]>;
type StatusFilter = "all" | NonNullable<AdminUserQueryParams["status"]>;

type PendingAction =
  | {
      type: "role";
      user: AdminUser;
      targetRole: AssignableUserRole;
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
    }
  | {
      type: "status";
      user: AdminUser;
      targetActive: boolean;
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
    };

const PAGE_SIZE = 12;

function getUserDisplayName(user: AdminUser): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.username || user.email;
}

function getUserRoleLabel(user: AdminUser): "Super Admin" | "General Admin" | "Farmer" | "Customer" {
  if (user.admin_role === "super_admin" || user.is_superuser) return "Super Admin";
  if (user.admin_role === "general_admin" || user.user_type === "admin" || user.is_staff) {
    return "General Admin";
  }
  if (user.user_type === "farmer") return "Farmer";
  return "Customer";
}

function getRoleBadgeVariant(roleLabel: ReturnType<typeof getUserRoleLabel>) {
  switch (roleLabel) {
    case "Super Admin":
      return "default";
    case "General Admin":
      return "secondary";
    case "Farmer":
      return "outline";
    default:
      return "outline";
  }
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const isSuperAdmin = Boolean(
    currentUser &&
      (currentUser.admin_role === "super_admin" ||
        (currentUser.is_superuser && (currentUser.user_type === "admin" || currentUser.is_staff))),
  );

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminService.getUsers({
        page,
        page_size: PAGE_SIZE,
        ...(appliedSearch ? { search: appliedSearch } : {}),
        ...(roleFilter !== "all" ? { role: roleFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setUsers(data.results);
      setTotalCount(data.count);
      setHasNext(Boolean(data.next));
      setHasPrevious(Boolean(data.previous));
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, appliedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const openRoleDialog = (target: AdminUser) => {
    const targetName = getUserDisplayName(target);
    const currentRole = getUserRoleLabel(target);

    if (currentRole === "General Admin") {
      const fallbackRole: AssignableUserRole = target.farmer_profile ? "farmer" : "customer";
      setActionReason("");
      setPendingAction({
        type: "role",
        user: target,
        targetRole: fallbackRole,
        title: "Revoke General Admin Role",
        description: `Are you sure you want to revoke General Admin privileges from ${targetName} (${target.email}) and restore them as a ${fallbackRole === "farmer" ? "Farmer" : "Customer"}?`,
        confirmLabel: "Revoke Admin Role",
        destructive: true,
      });
    } else {
      setActionReason("");
      setPendingAction({
        type: "role",
        user: target,
        targetRole: "general_admin",
        title: "Promote to General Admin",
        description: `Promote ${targetName} (${target.email}) to General Admin? They will gain administrative access to view users, manage farmers, and moderate products, without Super Admin role-management powers.`,
        confirmLabel: "Promote to General Admin",
        destructive: false,
      });
    }
  };

  const openStatusDialog = (target: AdminUser) => {
    const targetName = getUserDisplayName(target);
    const suspending = target.is_active !== false;
    setActionReason("");
    setPendingAction({
      type: "status",
      user: target,
      targetActive: !suspending,
      title: suspending ? "Suspend User Account" : "Reactivate User Account",
      description: suspending
        ? `Suspend ${targetName} (${target.email})? They will immediately lose access to login and protected APIs until reactivated.`
        : `Reactivate ${targetName} (${target.email}) so they can sign in and access their account again?`,
      confirmLabel: suspending ? "Suspend Account" : "Reactivate Account",
      destructive: suspending,
    });
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);
    try {
      let updatedUser: AdminUser;
      if (pendingAction.type === "role") {
        updatedUser = await adminService.updateUserRole(
          pendingAction.user.id,
          pendingAction.targetRole,
          actionReason,
        );
        toast({
          title: "Role updated",
          description: `${getUserDisplayName(updatedUser)} is now ${getUserRoleLabel(updatedUser)}.`,
        });
      } else {
        updatedUser = await adminService.updateUserStatus(
          pendingAction.user.id,
          pendingAction.targetActive,
          actionReason,
        );
        toast({
          title: updatedUser.is_active ? "Account reactivated" : "Account suspended",
          description: `${getUserDisplayName(updatedUser)} has been ${updatedUser.is_active ? "reactivated" : "suspended"}.`,
        });
      }

      setUsers((prev) => prev.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
      setPendingAction(null);
      setActionReason("");
      await fetchUsers();
    } catch (error: unknown) {
      toast({
        title: "Action failed",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasActiveFilters = Boolean(appliedSearch || roleFilter !== "all" || statusFilter !== "all");

  const renderUserActions = (target: AdminUser, compactMobile = false) => {
    const isSelf = currentUser?.id === target.id;
    const targetIsSuperAdmin = target.admin_role === "super_admin" || target.is_superuser;
    const targetIsGeneralAdmin =
      !targetIsSuperAdmin &&
      (target.admin_role === "general_admin" || target.user_type === "admin" || target.is_staff);

    if (!isSuperAdmin) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> View only
        </span>
      );
    }

    if (isSelf) {
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Your Account
        </Badge>
      );
    }

    if (targetIsSuperAdmin) {
      return (
        <Badge variant="outline" className="gap-1 text-xs font-normal">
          <Shield className="h-3 w-3" /> Protected
        </Badge>
      );
    }

    return (
      <div className={`flex flex-wrap gap-2 ${compactMobile ? "w-full" : "justify-end"}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openRoleDialog(target)}
          className={compactMobile ? "flex-1 min-w-[130px]" : ""}
        >
          {targetIsGeneralAdmin ? (
            <>
              <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Revoke Admin
            </>
          ) : (
            <>
              <UserCog className="mr-1.5 h-3.5 w-3.5" /> Make Admin
            </>
          )}
        </Button>

        <Button
          type="button"
          variant={target.is_active ? "ghost" : "outline"}
          size="sm"
          onClick={() => openStatusDialog(target)}
          className={`${target.is_active ? "text-destructive hover:text-destructive" : "text-primary"} ${
            compactMobile ? "flex-1 min-w-[120px]" : ""
          }`}
        >
          {target.is_active ? (
            <>
              <Ban className="mr-1.5 h-3.5 w-3.5" /> Suspend
            </>
          ) : (
            <>
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Reactivate
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage registered customers, farmers, and administrative access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {isSuperAdmin ? "Super Admin" : "General Admin (View Only)"}
          </Badge>
        </div>
      </div>

      {/* Search & Filters */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-end"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="user-search" className="text-xs uppercase text-muted-foreground">
            Search Users
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-search"
              type="search"
              placeholder="Search by name, username, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="role-filter" className="text-xs uppercase text-muted-foreground">
              Role
            </Label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as RoleFilter);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-44"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="general_admin">General Admin</option>
              <option value="farmer">Farmer</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-filter" className="text-xs uppercase text-muted-foreground">
              Status
            </Label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-36"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
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

      {/* Users Listing */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading users…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No registered users found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your search or role/status filters."
              : "Registered user accounts will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile: Stacked cards (< 768px) */}
          <ul className="divide-y divide-border md:hidden">
            {users.map((u) => {
              const roleLabel = getUserRoleLabel(u);
              const joinedDate = u.created_at
                ? new Date(u.created_at).toLocaleDateString()
                : "—";

              return (
                <li key={u.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {getUserDisplayName(u)}
                      </p>
                      <p className="break-all text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.is_active ? "Active" : "Suspended"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <Badge variant={getRoleBadgeVariant(roleLabel)}>{roleLabel}</Badge>
                    <span>Joined {joinedDate}</span>
                  </div>

                  <div className="pt-1">{renderUserActions(u, true)}</div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: Table (>= 768px) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const roleLabel = getUserRoleLabel(u);
                  const joinedDate = u.created_at
                    ? new Date(u.created_at).toLocaleDateString()
                    : "—";

                  return (
                    <tr key={u.id}>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {getUserDisplayName(u)}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-6 py-3">
                        <Badge variant={getRoleBadgeVariant(roleLabel)}>{roleLabel}</Badge>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.is_active
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {u.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{joinedDate}</td>
                      <td className="px-6 py-3 text-right">{renderUserActions(u, false)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Page {page} of {totalPages} · {totalCount} total user{totalCount === 1 ? "" : "s"}
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
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
            <Label htmlFor="audit-reason" className="text-xs font-medium text-muted-foreground">
              Audit Note / Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="audit-reason"
              type="text"
              maxLength={255}
              placeholder="e.g. Verified operations onboarding"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmAction();
              }}
              disabled={isSubmitting}
              className={
                pendingAction?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isSubmitting ? "Applying…" : pendingAction?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
