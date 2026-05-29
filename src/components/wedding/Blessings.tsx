import { useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const verses = [
  {
    ref: "1 Corinthians 13:4–7",
    text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud… It always protects, always trusts, always hopes, always perseveres.",
  },
  {
    ref: "Ecclesiastes 4:12",
    text: "Though one may be overpowered, two can defend themselves. A cord of three strands is not quickly broken.",
  },
  {
    ref: "Genesis 2:24",
    text: "Therefore a man shall leave his father and mother and hold fast to his wife, and they shall become one flesh.",
  },
  {
    ref: "Colossians 3:14",
    text: "And over all these virtues put on love, which binds them all together in perfect unity.",
  },
];

export function Blessings() {
  const [form, setForm] = useState({ name: "", note: "" });
  const [sent, setSent] = useState(false);

  return (
    <section className="bg-sage-veil relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  HIS WORD UPON US  ✦
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          Scripture &amp; Blessings
        </h2>
        <p className="font-display mt-3 text-[10px] tracking-[0.35em] text-[oklch(0.4_0.04_60)]/80">
          VERSES THAT GUIDE OUR JOURNEY TOGETHER
        </p>
        <Ornament className="mt-6" />

        <div className="mt-12 space-y-5 text-left">
          {verses.map((v, i) => (
            <motion.div
              key={v.ref}
              initial={{ opacity: 0, x: i % 2 ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded border border-gold/40 bg-white/80 p-5 backdrop-blur"
            >
              <span className="font-script text-2xl text-gold-gradient" aria-hidden>✝</span>
              <p className="mt-1 font-script italic text-[oklch(0.3_0.03_60)]">
                “{v.text}”
              </p>
              <p className="mt-3 font-display text-[10px] tracking-[0.35em] text-gold-gradient">
                — {v.ref.toUpperCase()}
              </p>
            </motion.div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name && form.note) setSent(true);
          }}
          className="mt-12 rounded border border-gold/40 bg-white/80 p-6 text-left backdrop-blur"
        >
          <p className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
            LEAVE A BLESSING FOR THE COUPLE
          </p>
          {sent ? (
            <p className="mt-4 font-script italic text-[oklch(0.3_0.03_60)]">
              Your blessing has been recorded. Thank you for praying with us ✦
            </p>
          ) : (
            <>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="mt-3 w-full border-b border-gold/40 bg-transparent py-2 font-script italic text-[oklch(0.3_0.03_60)] outline-none placeholder:text-[oklch(0.55_0.03_60)]/60 focus:border-gold"
              />
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="A prayer or wish for Rithin & Harshita…"
                rows={3}
                className="mt-3 w-full border-b border-gold/40 bg-transparent py-2 font-script italic text-[oklch(0.3_0.03_60)] outline-none placeholder:text-[oklch(0.55_0.03_60)]/60 focus:border-gold"
              />
              <button
                type="submit"
                className="mt-5 inline-block rounded border border-gold px-5 py-2 font-display text-[10px] tracking-[0.35em] text-gold-gradient transition hover:bg-gold/10"
              >
                SEND BLESSING
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}