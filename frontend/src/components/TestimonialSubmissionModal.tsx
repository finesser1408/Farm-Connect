import { useState, useEffect } from "react";
import { Star, MessageSquarePlus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth, getAuthErrorMessage } from "@/lib/auth-context";
import { reviewService } from "@/lib/services/review-service";

interface TestimonialSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function TestimonialSubmissionModal({
  open,
  onOpenChange,
  onSuccess,
}: TestimonialSubmissionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roleOrTitle, setRoleOrTitle] = useState("");
  const [consentPublic, setConsentPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (open && user?.user_type === "customer") {
      setIsLoadingExisting(true);
      reviewService
        .getMyTestimonial()
        .then((res) => {
          if (res.has_testimonial && res.testimonial) {
            setRating(res.testimonial.rating);
            setComment(res.testimonial.comment);
            setDisplayName(res.testimonial.display_name || "");
            setRoleOrTitle(res.testimonial.role_or_title || "");
            setConsentPublic(res.testimonial.consent_public);
            setExistingStatus(res.testimonial.status);
          } else {
            // Default suggested display name from user profile
            const suggested = [user.first_name, user.last_name ? `${user.last_name[0]}.` : ""]
              .filter(Boolean)
              .join(" ")
              .trim();
            setDisplayName(suggested);
            setExistingStatus(null);
          }
        })
        .catch(() => {
          // Ignore error loading previous feedback
        })
        .finally(() => {
          setIsLoadingExisting(false);
        });
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.user_type !== "customer") {
      toast({
        title: "Customer access only",
        description: "Only customers can submit platform testimonials.",
        variant: "destructive",
      });
      return;
    }

    if (comment.trim().length < 10) {
      toast({
        title: "Feedback too short",
        description: "Please share at least 10 characters describing your experience.",
        variant: "destructive",
      });
      return;
    }

    if (!consentPublic) {
      toast({
        title: "Consent required",
        description: "Please confirm consent to display your review publicly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await reviewService.submitTestimonial({
        rating,
        comment: comment.trim(),
        display_name: displayName.trim(),
        role_or_title: roleOrTitle.trim(),
        consent_public: consentPublic,
      });

      toast({
        title: existingStatus ? "Feedback updated!" : "Feedback submitted!",
        description: "Thank you! Your testimonial has been sent for admin moderation.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast({
        title: "Submission failed",
        description: getAuthErrorMessage(err) || "Failed to submit testimonial. Please try again.",
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
            <span className="text-xs font-semibold uppercase tracking-wider">Customer Feedback</span>
          </div>
          <DialogTitle className="font-display text-2xl font-bold text-foreground">
            {existingStatus ? "Update Your Testimonial" : "Share Your Experience"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Your review helps local farmers grow their businesses and helps other families discover fresh produce.
          </DialogDescription>
        </DialogHeader>

        {existingStatus && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {existingStatus === "approved" ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span>Your testimonial is currently published. Editing will resubmit it for admin review.</span>
              </>
            ) : existingStatus === "rejected" ? (
              <>
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <span>Your previous submission was not approved. You may update and resubmit it below.</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Your testimonial is pending administrative moderation. You can make adjustments below.</span>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Star Rating Picker */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Your Rating</Label>
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

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="testimonial-comment" className="text-sm font-medium">
                Written Feedback
              </Label>
              <span className="text-xs text-muted-foreground">{comment.length} / 1000</span>
            </div>
            <Textarea
              id="testimonial-comment"
              rows={4}
              maxLength={1000}
              placeholder="What do you love most about FarmConnect? How has ordering from local farmers helped your household?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              required
            />
          </div>

          {/* Public Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="testimonial-name" className="text-sm font-medium">
              Public Display Name <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="testimonial-name"
              type="text"
              maxLength={100}
              placeholder="e.g. Nicole M. or leave blank for First Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Role or Title */}
          <div className="space-y-1.5">
            <Label htmlFor="testimonial-role" className="text-sm font-medium">
              Role or Title <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="testimonial-role"
              type="text"
              maxLength={100}
              placeholder="e.g. Home Cook, Harare Resident, Baker"
              value={roleOrTitle}
              onChange={(e) => setRoleOrTitle(e.target.value)}
            />
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-2.5 rounded-lg border border-border p-3 bg-muted/30">
            <Checkbox
              id="consent-public"
              checked={consentPublic}
              onCheckedChange={(checked) => setConsentPublic(Boolean(checked))}
              className="mt-0.5"
            />
            <Label htmlFor="consent-public" className="text-xs font-normal text-muted-foreground leading-snug cursor-pointer">
              I consent to having my review, rating, and display name published publicly on the FarmConnect website.
            </Label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingExisting || !consentPublic || comment.trim().length < 10}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? "Submitting..." : existingStatus ? "Update Feedback" : "Submit Testimonial"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
