import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Priya M.",
    text: "The lavender pendant is absolutely stunning. You can see every tiny detail preserved perfectly. It's become my everyday piece.",
    rating: 5,
  },
  {
    name: "Ananya S.",
    text: "Ordered the coaster set as a gift — the recipient was blown away. The gold leaf accents make them look so luxurious.",
    rating: 5,
  },
  {
    name: "Riya K.",
    text: "The dandelion paperweight sits on my desk and makes me smile every day. True craftsmanship in every piece.",
    rating: 5,
  },
];

const TestimonialSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="text-center">
        <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          What people say
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground md:text-4xl">
          Customer Love
        </h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-xl bg-card p-8 shadow-soft"
          >
            <div className="flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} size={14} className="fill-gold text-gold" />
              ))}
            </div>
            <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground italic">
              "{t.text}"
            </p>
            <p className="mt-4 font-body text-sm font-semibold text-foreground">{t.name}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialSection;
