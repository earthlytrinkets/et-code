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
          <Link
            to="/shop"
            className="hidden items-center gap-1 font-body text-sm font-medium text-primary transition-colors hover:text-accent md:flex"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {/* Carousel wrapper — outer div is the positioning root */}
        <div className="relative mt-12">
          {/* Clip layer — separate from positioning root so overlay siblings escape its stacking context */}
          <div className="overflow-hidden">
            {isLoading ? (
              <div className="flex gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] w-[calc(50%-36px)] shrink-0 animate-pulse rounded-2xl bg-secondary lg:w-[calc(25%-30px)]"
                  />
                ))}
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {featured.map((product) => (
                  <div
                    key={product.id}
                    className="w-[calc(50%-36px)] shrink-0 lg:w-[calc(25%-30px)]"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gradient overlays — siblings of the clip layer, immune to its stacking context */}
          <div className="pointer-events-none absolute inset-0 z-10 flex">
            {/* Left fade — only visible when there's content to scroll back to */}
            <div
              className={`w-24 shrink-0 bg-gradient-to-r from-background via-background/60 to-transparent transition-opacity duration-300 ${
                canScrollLeft ? "opacity-100" : "opacity-0"
              }`}
            />
            <div className="flex-1" />
            {/* Right fade — only visible when there's content to scroll forward to */}
            <div
              className={`w-24 shrink-0 bg-gradient-to-l from-background via-background/60 to-transparent transition-opacity duration-300 ${
                canScrollRight ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          {/* Arrow buttons — z-20 so they sit above the gradient overlay */}
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className={`absolute left-1 top-[37%] z-20 -translate-y-1/2 p-1 text-primary transition-all duration-300 hover:text-primary/70 ${
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft size={30} strokeWidth={2} />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className={`absolute right-1 top-[37%] z-20 -translate-y-1/2 p-1 text-primary transition-all duration-300 hover:text-primary/70 ${
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronRight size={30} strokeWidth={2} />
          </button>
        </div>

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
