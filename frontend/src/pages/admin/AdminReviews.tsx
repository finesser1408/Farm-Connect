import { useCallback, useEffect, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Search, Star, XCircle } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAuthErrorMessage } from "@/lib/auth-context";
import {
  adminService,
  type AdminPlatformTestimonial,
  type AdminProductReview,
  type ModerationDecision,
  type ModerationStatus,
} from "@/lib/services/admin-service";

type SubmissionKind = "reviews" | "testimonials";
type Submission = AdminProductReview | AdminPlatformTestimonial;

const PAGE_SIZE = 12;

const STATUS_FILTERS: { value: ModerationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_BADGE_CLASSES: Record<ModerationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const KIND_LABELS: Record<SubmissionKind, { singular: string; plural: string }> = {
  reviews: { singular: "product review", plural: "product reviews" },
  testimonials: { singular: "testimonial", plural: "platform testimonials" },
};

interface PendingDecision {
  submission: Submission;
  decision: ModerationDecision;
}

function isProductReview(item: Submission): item is AdminProductReview {
  return "product_name" in item;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}>
      {status}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function ModerationPanel({ kind }: { kind: SubmissionKind }) {
  const { toast } = useToast();
  const labels = KIND_LABELS[kind];

  const [items, setItems] = useState<Submission[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ModerationStatus>("pending");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        status: statusFilter,
        ...(appliedSearch ? { search: appliedSearch } : {}),
      };
      const data =
        kind === "reviews" ? await adminService.getProductReviews(params) : await adminService.getTestimonials(params);
      setItems(data.results);
      setTotalCount(data.count);
      setHasNext(Boolean(data.next));
      setHasPrevious(Boolean(data.previous));
    } catch (error: unknown) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [kind, page, statusFilter, appliedSearch]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleConfirm = async () => {
    if (!pendingDecision) return;
    const { submission, decision } = pendingDecision;
    setIsSubmitting(true);
    try {
      if (kind === "reviews") {
        await adminService.moderateProductReview(submission.id, decision, reason);
      } else {
        await adminService.moderateTestimonial(submission.id, decision, reason);
      }
      toast({
        title: decision === "approved" ? "Submission approved" : "Submission rejected",
        description:
          decision === "approved"
            ? `The ${labels.singular} from ${submission.customer_name} is now publicly visible.`
            : `The ${labels.singular} from ${submission.customer_name} is hidden from public pages.`,
      });
      setPendingDecision(null);
      setReason("");
      await fetchItems();
    } catch (error: unknown) {
      toast({ title: "Moderation failed", description: getAuthErrorMessage(error), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDecision = (submission: Submission, decision: ModerationDecision) => {
    setReason("");
    setPendingDecision({ submission, decision });
  };

  const renderActions = (item: Submission, compact = false) => (
    <div className={`flex flex-wrap gap-2 ${compact ? "w-full" : "justify-end"}`}>
      {item.status !== "approved" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openDecision(item, "approved")}
          className={`text-primary ${compact ? "flex-1" : ""}`}
        >
          <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
        </Button>
      )}
      {item.status !== "rejected" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => openDecision(item, "rejected")}
          className={`text-destructive hover:text-destructive ${compact ? "flex-1" : ""}`}
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
        </Button>
      )}
    </div>
  );

  const renderFeedback = (item: Submission) => (
    <div className="min-w-0 space-y-1">
      {isProductReview(item) && item.title && <p className="font-medium text-foreground">{item.title}</p>}
      <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{item.comment}</p>
      {!isProductReview(item) && (
        <p className="text-xs text-muted-foreground">
          Public name: {item.effective_display_name}
          {item.role_or_title ? ` · ${item.role_or_title}` : ""}
        </p>
      )}
    </div>
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statusLabel = STATUS_FILTERS.find((s) => s.value === statusFilter)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:p-4 lg:flex-row lg:items-end">
        <div className="space-y-1.5">
          <span className="text-xs uppercase text-muted-foreground">Status</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Moderation status filter">
            {STATUS_FILTERS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={statusFilter === option.value ? "default" : "outline"}
                aria-pressed={statusFilter === option.value}
                onClick={() => {
                  setStatusFilter(option.value);
                  setPage(1);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor={`${kind}-search`} className="text-xs uppercase text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${kind}-search`}
                type="search"
                placeholder={
                  kind === "reviews" ? "Customer, email, product, or text..." : "Customer, email, or text..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 sm:flex-none">
              Search
            </Button>
            {appliedSearch && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setAppliedSearch("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Loading {labels.plural}…
        </div>
      ) : errorMessage ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="text-sm font-medium text-destructive">{errorMessage}</p>
          <Button type="button" variant="outline" size="sm" onClick={fetchItems} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            No {statusLabel} {labels.plural} found.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {appliedSearch ? "Try adjusting your search." : "New customer submissions appear under Pending."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          {/* Mobile cards */}
          <ul className="divide-y divide-border md:hidden">
            {items.map((item) => (
              <li key={item.id} className="space-y-3 p-4" data-testid={`${kind}-card-${item.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{item.customer_name}</p>
                    <p className="break-all text-xs text-muted-foreground">{item.customer_email}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {isProductReview(item) && (
                  <p className="text-xs text-muted-foreground">
                    Product: <span className="font-medium text-foreground">{item.product_name}</span>
                  </p>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <RatingStars rating={item.rating} />
                  <span>{formatDate(item.created_at)}</span>
                </div>
                {renderFeedback(item)}
                {renderActions(item, true)}
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">Customer</th>
                  {kind === "reviews" && <th className="px-4 py-3">Product</th>}
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{item.customer_email}</p>
                    </td>
                    {kind === "reviews" && isProductReview(item) && (
                      <td className="px-4 py-3 text-foreground">{item.product_name}</td>
                    )}
                    <td className="px-4 py-3">
                      <RatingStars rating={item.rating} />
                    </td>
                    <td className="max-w-md px-4 py-3">{renderFeedback(item)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                      {item.moderated_by_email && (
                        <p className="mt-1 text-xs text-muted-foreground">by {item.moderated_by_email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{renderActions(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              Page {page} of {totalPages} · {totalCount} {statusLabel} {totalCount === 1 ? labels.singular : labels.plural}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!hasNext}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={Boolean(pendingDecision)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setPendingDecision(null);
            setReason("");
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDecision?.decision === "approved" ? "Approve submission?" : "Reject submission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision?.decision === "approved"
                ? `This ${labels.singular} from ${pendingDecision?.submission.customer_name} will become visible on public pages.`
                : `This ${labels.singular} from ${pendingDecision?.submission.customer_name} will be hidden from public pages. The record is kept and can be approved later.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor={`${kind}-moderation-reason`} className="text-xs font-medium text-muted-foreground">
              Audit Note / Reason <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id={`${kind}-moderation-reason`}
              type="text"
              maxLength={255}
              placeholder="e.g. Contains inappropriate language"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={isSubmitting}
              className={
                pendingDecision?.decision === "rejected"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {isSubmitting ? "Applying…" : pendingDecision?.decision === "approved" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminReviews() {
  const [activeTab, setActiveTab] = useState<SubmissionKind>("reviews");

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl text-foreground">Reviews &amp; Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          Moderate customer feedback. Only approved submissions appear on public pages.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SubmissionKind)}>
        <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="reviews">Product Reviews</TabsTrigger>
          <TabsTrigger value="testimonials">Platform Testimonials</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-4">
          <ModerationPanel kind="reviews" />
        </TabsContent>
        <TabsContent value="testimonials" className="mt-4">
          <ModerationPanel kind="testimonials" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
