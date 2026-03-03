import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import GracefulImage from "@/components/GracefulImage";

const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="container mx-auto px-4 lg:px-8">
      <div className="grid min-h-[85vh] items-center gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="order-2 lg:order-1"
        >
          <p className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Handcrafted with love
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
            Nature,{" "}
            <span className="italic text-primary">Preserved</span>
            <br />
            in Resin.
          </h1>
          <p className="mt-6 max-w-md font-body text-base leading-relaxed text-muted-foreground">
            Each piece tells a story of nature's fleeting beauty, captured forever in crystal-clear resin. 
            Handcrafted jewellery and art that celebrates the earth's quiet wonders.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-body text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow"
            >
              Explore Collection
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/custom-orders"
              className="inline-flex items-center gap-2 rounded-full border border-border px-8 py-3.5 font-body text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Custom Orders
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="order-1 lg:order-2"
        >
          <div className="relative">
            <GracefulImage
              src={heroImage}
              alt="Handcrafted epoxy resin jewellery"
              className="w-full rounded-2xl object-cover shadow-elevated"
            />
            <div className="absolute -bottom-4 -left-4 rounded-xl bg-card p-4 shadow-elevated">
              <p className="font-display text-2xl font-bold text-primary">500+</p>
              <p className="font-body text-xs text-muted-foreground">Happy Customers</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
