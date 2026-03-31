import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useRef, useState, useEffect } from "react";
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
      const { data, error } = await supabase
        .from("reviews" as never)
        .select("id, rating, comment, created_at, products(name), profiles(full_name)")
        .eq("rating", 5)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data as unknown as {
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        products: { name: string } | null;
        profiles: { full_name: string | null } | null;
      }[]).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        product_name: r.products?.name ?? "Product",
        reviewer_name: r.profiles?.full_name ?? null,
      })) as Review[];
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
      "{review.comment}"
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const placeholders: Review[] = Array.from({ length: 6 }, (_, i) => ({
    id: `placeholder-${i}`,
    rating: 5,
    comment: "Reviews coming soon — we can't wait to hear what you think!",
    created_at: new Date().toISOString(),
    product_name: "Earthly Trinkets",
    reviewer_name: null,
  }));

  const items = reviews.length > 0 ? reviews : placeholders;
  const displayReviews = [...items, ...items];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    let animId: number;
    let lastTime = 0;
    const speed = 0.5; // pixels per frame (~30px/sec at 60fps)

    const step = (time: number) => {
      if (lastTime && !paused) {
        el.scrollLeft += speed * ((time - lastTime) / 16.67);
        // Reset scroll when first set is fully scrolled past
        const halfWidth = el.scrollWidth / 2;
        if (el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }
      lastTime = time;
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [items.length, paused]);

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

      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex gap-6 overflow-x-hidden px-4 lg:px-8"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {displayReviews.map((review, i) => (
          <ReviewCard key={`${review.id}-${i}`} review={review} />
        ))}
      </div>
    </section>
  );
};

export default TestimonialSection;
