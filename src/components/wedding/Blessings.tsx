import { useState } from "react";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";
import { supabase } from "@/integrations/supabase/client";

const verses = [
  {
    ref: "1 Corinthians 13:4,7",
    text: "Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.",
  },
];

export function Blessings() {
  const [form, setForm] = useState({ name: "", note: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="bg-lux-warm relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  HIS WORD UPON US  ✦
        </p>
        <h2 className="font-script mt-4 text-4xl italic text-gold-gradient md:text-5xl">
          Leave Your Blessings
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-script text-lg italic ink-soft">
          Your prayers, blessings, and heartfelt wishes mean the world to us as we begin this beautiful journey together.
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
              className="relative rounded-md border border-gold/50 bg-white/90 p-6 shadow-gold backdrop-blur"
            >
              <span className="font-script text-2xl text-gold-gradient" aria-hidden>✝</span>
              <p className="mt-2 font-script text-lg italic leading-relaxed ink md:text-xl">
                “{v.text}”
              </p>
              <p className="mt-4 font-display text-[11px] font-semibold tracking-[0.35em] text-gold-gradient">
                — {v.ref.toUpperCase()}
              </p>
            </motion.div>
          ))}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = form.name.trim();
            const note = form.note.trim();
            if (!name || !note) return;
            setSubmitting(true);
            setError(null);
            const { error: insertError } = await supabase
              .from("blessings")
              .insert({ name, note });
            setSubmitting(false);
            if (insertError) {
              setError("Sorry, something went wrong. Please try again.");
              return;
            }
            setSent(true);
          }}
          className="mt-12 rounded-md border border-gold/50 bg-white/90 p-7 text-left shadow-gold backdrop-blur"
        >
          <p className="font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient">
            LEAVE A BLESSING FOR THE COUPLE
          </p>
          {sent ? (
            <p className="mt-4 font-script text-lg italic ink">
              Your blessing has been recorded. Thank you for praying with us ✦
            </p>
          ) : (
            <>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your Name"
                maxLength={80}
                className="mt-4 w-full border-b border-gold/50 bg-transparent py-2 font-script text-lg italic ink outline-none placeholder:text-[oklch(0.55_0.03_60)]/70 focus:border-gold"
              />
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Share your blessing, prayer, or wishes for Rithin & Harshita..."
                rows={3}
                maxLength={500}
                className="mt-3 w-full border-b border-gold/50 bg-transparent py-2 font-script text-lg italic ink outline-none placeholder:text-[oklch(0.55_0.03_60)]/70 focus:border-gold"
              />
              {error && (
                <p className="mt-3 font-script italic text-sm text-[oklch(0.45_0.15_25)]">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 inline-block rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
              >
                {submitting ? "SENDING…" : "SEND BLESSING"}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}