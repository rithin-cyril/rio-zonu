import { motion } from "motion/react";
import { Ornament } from "./Ornament";

export function Welcome() {
  return (
    <section className="bg-royal relative overflow-hidden border-y border-gold/30 py-24 md:py-28">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          A SACRED INVITATION
        </p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="font-script mt-4 text-4xl italic leading-tight text-gold-gradient md:text-5xl"
        >
          By God’s Grace,
          <br />
          We Begin Our Forever
        </motion.h2>
        <Ornament className="mt-6" />
        <p className="mx-auto mt-8 max-w-xl font-script text-lg italic leading-relaxed ink md:text-xl">
          Together with our families, we warmly invite you to celebrate our wedding
          and witness the beginning of our lifelong journey together.
        </p>
        <div className="mx-auto mt-10 inline-flex flex-col items-center border-y border-gold/60 px-8 py-4">
          <p className="font-display text-[10px] font-semibold tracking-[0.4em] ink-soft">
            VENUE
          </p>
          <p className="font-script mt-2 text-2xl italic text-gold-gradient">
            CSI Kanthi Church
          </p>
          <p className="font-display mt-1 text-[11px] tracking-[0.3em] ink-soft">
            ANANDAPURA · SOUTH COORG
          </p>
        </div>
      </div>
    </section>
  );
}