import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BackToTop = () => {
  const [show, setShow] = useState(false);
  const [bottom, setBottom] = useState(24);

  useEffect(() => {
    const update = () => {
      setShow(window.scrollY > 400);

      const bar = document.getElementById("footer-bar");
      if (bar) {
        const barTop = bar.getBoundingClientRect().top;
        const aboveBar = window.innerHeight - barTop;
        setBottom(aboveBar > 0 ? aboveBar + 16 : 24);
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        // Outer: handles entry / exit
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ bottom: `${bottom}px` }}
          className="fixed right-6 z-50"
        >
          {/* Inner: continuous idle bounce */}
          <motion.button
            animate={{ y: [0, -6, 0] }}
            transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
            whileTap={{ scale: 0.75, transition: { type: "spring", stiffness: 400, damping: 15 } }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="rounded-full bg-card/70 p-3 text-primary backdrop-blur-md ring-1 ring-primary/20 shadow-[0_0_16px_hsl(var(--primary)/0.3)] transition-[background,box-shadow] hover:bg-card/90 hover:ring-primary/40 hover:shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
          >
            <ArrowUp size={18} />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
