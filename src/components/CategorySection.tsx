import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { categories } from "@/data/products";
import { Gem, BookOpen, Home, Sparkles } from "lucide-react";

const iconMap = {
  jewellery: Gem,
  paperweights: BookOpen,
  "home-decor": Home,
  "custom-pieces": Sparkles,
};

const CategorySection = () => (
  <section className="bg-secondary/40 py-24">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Browse by
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
          Categories
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => {
          const Icon = iconMap[cat.id];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to={`/shop?category=${cat.id}`}
                className="group block rounded-xl bg-card p-8 text-center shadow-soft transition-all hover:shadow-elevated"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={24} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {cat.label}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {cat.description}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default CategorySection;
