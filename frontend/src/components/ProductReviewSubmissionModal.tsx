import { useState, useEffect } from "react";
import { Star, MessageSquarePlus, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getAuthErrorMessage } from "@/lib/auth-context";
import { reviewService } from "@/lib/services/review-service";

interface ProductReviewSubmissionModalProps {
  productSlug: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ProductReviewSubmissionModal({
  productSlug,
  productName,
  open,
  onOpenChange,
  onSuccess,
}: ProductReviewSubmissionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.user_type === "customer" && productSlug) {
      setIsLoadingExisting(true);
      reviewService
        .getMyProductReview(productSlug)
        .then((res) => {
          if (res.has_review && res.review) {
            setRating(res.review.rating);
            setTitle(res.review.title || "");
            setComment(res.review.comment);
            setExistingStatus((res.review as any).status || "pending");
          } else {
            setTitle("");
            setComment("");
            setRating(5);
            setExistingStatus(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsLoadingExisting(false);
        });
    }
  }, [open, user, productSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.user_type !== "customer") {
      toast({
        title: "Customer access only",
        description: "Only customers can submit reviews.",
        variant: "destructive",
      });
      return;
    }

    if (comment.trim().length < 10) {
      toast({
        title: "Review too short",
        description: "Please share at least 10 characters describing the quality of this produce.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.submitProductReview(productSlug, {
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });

      toast({
        title: existingStatus ? "Review updated!" : "Review submitted!",
        description: "Thank you! Your review has been submitted for moderation.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast({
        title: "Submission failed",
        description: getAuthErrorMessage(err) || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:rounded-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-green-600">
            <MessageSquarePlus className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Product Review</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            {existingStatus ? "Update Your Review" : `Review ${productName}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Help other customers know about the taste, freshness, and quality of this produce.
          </DialogDescription>
        </DialogHeader>

        {existingStatus && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {existingStatus === "approved" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span>Your review is currently published. Editing will submit it for admin re-review.</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Your review is pending moderation. You can make adjustments below.</span>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Star Rating Picker */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Rating</Label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  className="rounded p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-muted-foreground">
                {hoverRating || rating} / 5
              </span>
            </div>
          </div>

          {/* Headline / Title */}
          <div className="space-y-1.5">
            <Label htmlFor="review-title" className="text-sm font-medium">
              Headline <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="review-title"
              type="text"
              maxLength={120}
              placeholder="e.g. Incredibly fresh and sweet!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Written Comment */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="review-comment" className="text-sm font-medium">
                Written Review
              </Label>
              <span className="text-xs text-muted-foreground">{comment.length} / 1000</span>
            </div>
            <Textarea
              id="review-comment"
              rows={4}
              maxLength={1000}
              placeholder="Describe the freshness, taste, and condition upon delivery."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingExisting || comment.trim().length < 10}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Submitting..." : existingStatus ? "Update Review" : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
