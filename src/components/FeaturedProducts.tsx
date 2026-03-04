import { useRef, useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useFeaturedProducts } from "@/hooks/useProducts";

const FeaturedProducts = () => {
  const { data: featured = [], isLoading } = useFeaturedProducts();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(checkScroll);
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [featured]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 280;
    el.scrollBy({ left: dir === "left" ? -(cardWidth + 24) : cardWidth + 24, behavior: "smooth" });
  };

  return (
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Curated for you
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              Featured Pieces
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Arrow buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <Link
              to="/shop"
              className="hidden items-center gap-1 font-body text-sm font-medium text-primary transition-colors hover:text-accent md:flex"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex gap-6 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-[calc(50%-12px)] shrink-0 animate-pulse rounded-2xl bg-secondary lg:w-[calc(25%-18px)]" />
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="mt-12 flex gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {featured.map((product) => (
              <div
                key={product.id}
                className="w-[calc(50%-12px)] shrink-0 lg:w-[calc(25%-18px)]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center md:hidden">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1 font-body text-sm font-medium text-primary"
          >
            View all products <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
