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
    // scrollend fires once after scroll fully settles — avoids flicker from mid-animation state updates
    el?.addEventListener("scrollend", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      cancelAnimationFrame(raf);
      el?.removeEventListener("scrollend", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [featured]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const cur = el.scrollLeft;
    if (dir === "right") {
      const next = cards.find((c) => c.offsetLeft > cur + 4);
      el.scrollTo({ left: next ? next.offsetLeft : el.scrollWidth - el.clientWidth, behavior: "smooth" });
    } else {
      const prev = [...cards].reverse().find((c) => c.offsetLeft < cur - 4);
      el.scrollTo({ left: prev ? prev.offsetLeft : 0, behavior: "smooth" });
    }
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
          {/* Clip layer — overflow-x:clip only clips horizontally, unlike overflow-hidden which clips both axes */}
          <div className="[overflow-x:clip]">
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
                className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory overscroll-x-contain [touch-action:pan-x] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {featured.map((product, index) => (
                  <div
                    key={product.id}
                    className={`w-[calc(50%-36px)] shrink-0 lg:w-[calc(25%-30px)] ${
                      index === featured.length - 1 ? "snap-end" : "snap-start"
                    }`}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Arrow buttons */}
          <button
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className={`absolute left-1 top-[37%] z-10 -translate-y-1/2 rounded-full bg-card/80 p-2 text-primary backdrop-blur-sm ring-1 ring-primary/25 shadow-[0_0_14px_hsl(var(--primary)/0.35)] transition-all hover:ring-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] ${
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ChevronLeft size={30} strokeWidth={2} />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className={`absolute right-1 top-[37%] z-10 -translate-y-1/2 rounded-full bg-card/80 p-2 text-primary backdrop-blur-sm ring-1 ring-primary/25 shadow-[0_0_14px_hsl(var(--primary)/0.35)] transition-all hover:ring-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] ${
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
