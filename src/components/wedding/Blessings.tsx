import { useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const wishes = [
  {
    side: "GROOM SIDE",
    from: "Sundaresan & Alamelu",
    relation: "Grandparents",
    note: "Wishing the divine couple a lifetime of abundance, sound health, and pure spiritual joy. Om Namah Shivaya.",
  },
  {
    side: "BRIDE SIDE",
    from: "Karthik & Janani",
    relation: "Cousins",
    note: "So incredibly happy to see our family unite. We cannot wait to witness this magnificent celebration.",
  },
  {
    side: "WELL-WISHER",
    from: "Dr. R. Venkatraman",
    relation: "Family Friend",
    note: "May Ganesha clear all obstacles from your path as you begin this beautiful new chapter of family life together.",
  },
  {
    side: "BRIDE SIDE",
    from: "Lakshmi Aunty",
    relation: "Maternal Aunt",
    note: "From your first steps to this sacred day — every moment has been a blessing. May Lakshmi devi shower you both.",
  },
];

export function Blessings() {
  const [form, setForm] = useState({ name: "", note: "" });
  const [sent, setSent] = useState(false);

  return (
    <section className="bg-emerald-royal relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  TEMPLE GOLDEN SCROLL  ✦
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          Blessings Wall
        </h2>
        <p className="font-display mt-3 text-[10px] tracking-[0.35em] text-[oklch(0.82_0.1_85)]/80">
          TRADITIONAL PLAQUES FROM FRIENDS AND FAMILY
        </p>
        <Ornament className="mt-6" />

        <div className="mt-12 space-y-5 text-left">
          {wishes.map((w, i) => (
            <motion.div
              key={w.from}
              initial={{ opacity: 0, x: i % 2 ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded border border-gold/40 bg-[oklch(0.2_0.06_28)]/70 p-5 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base text-[oklch(0.95_0.04_85)]">
                    {w.from}
                  </p>
                  <p className="font-display text-[9px] tracking-[0.3em] text-[oklch(0.78_0.1_80)]/80">
                    {w.relation.toUpperCase()} · ATTENDING
                  </p>
                </div>
                <span className="rounded border border-gold/50 px-2 py-0.5 font-display text-[9px] tracking-[0.25em] text-gold-gradient">
                  {w.side}
                </span>
              </div>
              <p className="mt-3 font-script italic text-[oklch(0.88_0.05_90)]/85">
                “{w.note}”
              </p>
            </motion.div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name && form.note) setSent(true);
          }}
          className="mt-12 rounded border border-gold/40 bg-[oklch(0.2_0.06_28)]/60 p-6 text-left backdrop-blur"
        >
          <p className="font-display text-[10px] tracking-[0.4em] text-gold-gradient">
            LEAVE YOUR BLESSING
          </p>
          {sent ? (
            <p className="mt-4 font-script italic text-[oklch(0.88_0.05_90)]">
              Your blessing has been added to the golden scroll. Thank you ✦
            </p>
          ) : (
            <>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                className="mt-3 w-full border-b border-gold/40 bg-transparent py-2 font-script italic text-[oklch(0.95_0.04_85)] outline-none placeholder:text-[oklch(0.7_0.05_85)]/60 focus:border-gold"
              />
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="A wish for the couple…"
                rows={3}
                className="mt-3 w-full border-b border-gold/40 bg-transparent py-2 font-script italic text-[oklch(0.95_0.04_85)] outline-none placeholder:text-[oklch(0.7_0.05_85)]/60 focus:border-gold"
              />
              <button
                type="submit"
                className="mt-5 inline-block rounded border border-gold px-5 py-2 font-display text-[10px] tracking-[0.35em] text-gold-gradient transition hover:bg-[oklch(0.72_0.11_80)]/10"
              >
                SEAL THE BLESSING
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}