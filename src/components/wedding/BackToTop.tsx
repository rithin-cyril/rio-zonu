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
          className="fixed bottom-5 right-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gold bg-white/85 shadow-gold backdrop-blur md:bottom-6 md:right-6 md:h-12 md:w-12"
        >
          <ChevronUp className="h-5 w-5 text-[oklch(0.42_0.1_70)]" strokeWidth={1.8} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}