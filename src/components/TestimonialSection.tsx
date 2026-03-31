import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  product_name: string;
  reviewer_name: string | null;
};

const useTopReviews = () =>
  useQuery({
    queryKey: ["top-reviews"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as Function)(
        "get_verified_top_reviews",
        { p_limit: 10 },
      );
      if (error) throw error;
      return (data ?? []) as Review[];
    },
    staleTime: 5 * 60 * 1000,
  });

function formatName(name: string | null) {
  if (!name) return "Happy Customer";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const ReviewCard = ({ review }: { review: Review }) => (
  <div className="flex-shrink-0 w-[300px] sm:w-[340px] rounded-xl bg-card p-7 shadow-soft">
    <div className="flex gap-0.5">
      {Array.from({ length: review.rating }).map((_, j) => (
        <Star key={j} size={14} className="fill-gold text-gold" />
      ))}
    </div>
    <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground italic line-clamp-4">
      &ldquo;{review.comment}&rdquo;
    </p>
    <div className="mt-4">
      <p className="font-body text-sm font-semibold text-foreground">
        {formatName(review.reviewer_name)}
      </p>
      <p className="font-body text-xs text-muted-foreground">{review.product_name}</p>
    </div>
  </div>
);

const TestimonialSection = () => {
  const { data: reviews = [] } = useTopReviews();
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const pausedRef = useRef(false);

  const placeholders: Review[] = Array.from({ length: 6 }, (_, i) => ({
    id: `placeholder-${i}`,
    rating: 5,
    comment: "Reviews coming soon — we can't wait to hear what you think!",
    created_at: new Date().toISOString(),
    product_name: "Earthly Trinkets",
    reviewer_name: null,
  }));

  const items = reviews.length > 0 ? reviews : placeholders;

  useEffect(() => {
    const track = trackRef.current;
    const setEl = setRef.current;
    if (!track || !setEl || items.length === 0) return;

    let animId: number;
    let lastTime = 0;
    const speed = 50; // pixels per second

    const step = (time: number) => {
      if (lastTime && !pausedRef.current) {
        const dt = (time - lastTime) / 1000;
        posRef.current += speed * dt;

        // setEl.offsetWidth includes the pr-6 padding, giving exact set width
        const setWidth = setEl.offsetWidth;
        if (setWidth > 0 && posRef.current >= setWidth) {
          posRef.current -= setWidth;
        }

        track.style.transform = `translate3d(-${posRef.current}px, 0, 0)`;
      }
      lastTime = time;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [items.length]);

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Real Reviews
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
            Customer Love
          </h2>
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-max will-change-transform"
          onMouseEnter={() => { pausedRef.current = true; }}
          onMouseLeave={() => { pausedRef.current = false; }}
          onTouchStart={() => { pausedRef.current = true; }}
          onTouchEnd={() => { pausedRef.current = false; }}
        >
          {/* Two identical sets — pr-6 after each set matches the gap between cards */}
          <div ref={setRef} className="flex gap-6 shrink-0 pr-6">
            {items.map((review, i) => (
              <ReviewCard key={`${review.id}-a-${i}`} review={review} />
            ))}
          </div>
          <div className="flex gap-6 shrink-0 pr-6">
            {items.map((review, i) => (
              <ReviewCard key={`${review.id}-b-${i}`} review={review} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
