import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gem, Sparkles, Leaf, Droplets, FlowerIcon, Star } from "lucide-react";
import logo from "@/assets/logo.png";

const ICONS = [Gem, Sparkles, Leaf, Droplets, FlowerIcon, Star];

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const cycle = setInterval(() => setIdx((i) => (i + 1) % ICONS.length), 380);
    const exit  = setTimeout(() => {
      clearInterval(cycle);
      setLeaving(true);
      setTimeout(onDone, 700);
    }, 2200);
    return () => { clearInterval(cycle); clearTimeout(exit); };
  }, [onDone]);

  const Icon = ICONS[idx];

  return (
    <AnimatePresence>
      {!leaving && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background"
        >
          {/* Logo */}
          <motion.img
            src={logo}
            alt="Earthly Trinkets"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.1 }}
            className="h-20 w-20 rounded-full object-cover shadow-[0_0_32px_hsl(var(--primary)/0.35)]"
          />

          {/* Brand name */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mt-5 font-display text-2xl font-bold tracking-wide"
          >
            <span className="text-primary italic">Earthly</span>{" "}
            <span className="text-foreground">Trinkets</span>
          </motion.p>

          {/* Cycling icon */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative mt-8 h-9 w-9"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.4, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.4, rotate: 20 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center text-primary"
              >
                <Icon size={26} strokeWidth={1.5} />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.6 }}
            className="mt-4 font-body text-xs tracking-[0.18em] uppercase text-muted-foreground"
          >
            Handcrafted with love
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
