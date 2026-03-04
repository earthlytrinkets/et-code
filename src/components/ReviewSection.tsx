import { useState } from "react";
import { Star, Trash2, Loader2, MessageSquare, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useReviews, useMyReview, useSubmitReview, useDeleteReview } from "@/hooks/useReviews";

// ─── Star picker ──────────────────────────────────────────────────────────────

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
        >
          <Star
            size={24}
            className={
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-border hover:text-yellow-300"
            }
          />
        </button>
      ))}
    </div>
  );
};

// ─── Static star display ──────────────────────────────────────────────────────

const Stars = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={size}
        className={s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-border"}
      />
    ))}
  </div>
);

// ─── Review Section ───────────────────────────────────────────────────────────

const ReviewSection = ({ productId }: { productId: string }) => {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useReviews(productId);
  const { data: myReview } = useMyReview(productId, user?.id);
  const submitReview = useSubmitReview(productId);
  const deleteReview = useDeleteReview(productId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);

  const startEdit = () => {
    setRating(myReview?.rating ?? 0);
    setComment(myReview?.comment ?? "");
    setEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating === 0) return toast.error("Please select a star rating");
    await submitReview.mutateAsync(
      { userId: user.id, rating, comment },
      {
        onSuccess: () => {
          toast.success(myReview ? "Review updated!" : "Review submitted!");
          setEditing(false);
          setRating(0);
          setComment("");
        },
        onError: () => toast.error("Failed to submit review"),
      }
    );
  };

  const handleDelete = async () => {
    if (!myReview) return;
    await deleteReview.mutateAsync(myReview.id, {
      onSuccess: () => toast.success("Review deleted"),
      onError: () => toast.error("Failed to delete review"),
    });
  };

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <section id="reviews" className="mt-16 border-t border-border pt-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Reviews</h2>
          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <Stars rating={avgRating} size={16} />
              <span className="font-body text-sm text-muted-foreground">
                {avgRating.toFixed(1)} out of 5 · {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}
        </div>
        {user && myReview && !editing && (
          <button
            onClick={startEdit}
            className="font-body text-xs text-primary hover:underline"
          >
            Edit your review
          </button>
        )}
      </div>

      {/* Write / edit review form */}
      {user ? (
        !myReview || editing ? (
          <form
            onSubmit={handleSubmit}
            className="mb-10 rounded-xl border border-border bg-card p-6 space-y-4"
          >
            <h3 className="font-display text-sm font-semibold text-foreground">
              {myReview ? "Edit your review" : "Write a review"}
            </h3>
            <StarPicker value={rating} onChange={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience... (optional)"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitReview.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-body text-xs font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {submitReview.isPending && <Loader2 size={14} className="animate-spin" />}
                {myReview ? "Update Review" : "Submit Review"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full px-6 py-2.5 font-body text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : null
      ) : (
        <p className="mb-8 font-body text-sm text-muted-foreground">
          <span className="text-primary font-medium cursor-pointer">Sign in</span> to leave a review.
        </p>
      )}

      {/* Review list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <MessageSquare size={32} className="text-muted-foreground/30" />
          <p className="mt-3 font-body text-sm text-muted-foreground">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                      {(review.profiles?.full_name ?? "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-semibold text-foreground">
                          {review.profiles?.full_name ?? "Anonymous"}
                        </p>
                        {review.verified_buyer && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-body text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <BadgeCheck size={10} /> Verified Buyer
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                  {review.comment && (
                    <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
                {user?.id === review.user_id && !editing && (
                  <button
                    onClick={handleDelete}
                    disabled={deleteReview.isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ReviewSection;
