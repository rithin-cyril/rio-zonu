import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 16, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.8 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.35 }}
          className="fixed bottom-5 right-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-[oklch(0.72_0.09_80)]/50 bg-white/90 shadow-gold backdrop-blur md:bottom-6 md:right-6"
        >
          <ChevronUp className="h-4 w-4 text-[oklch(0.52_0.09_72)]" strokeWidth={1.8} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}