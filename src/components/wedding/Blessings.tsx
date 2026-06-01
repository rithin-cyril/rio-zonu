import { useState } from "react";
import { motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";

const verse = {
  ref: "1 Corinthians 13:4, 7",
  text: "Love is patient, love is kind. It always protects, always trusts, always hopes, always perseveres.",
};

export function Blessings() {
  const [form, setForm] = useState({ name: "", note: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="bg-sage-veil relative overflow-hidden py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card-premium px-7 py-9"
        >
          <p className="font-script text-xl italic leading-relaxed ink md:text-2xl">
            “{verse.text}”
          </p>
          <p className="mt-5 font-display text-[10px] tracking-[0.3em] text-gold-gradient">
            — {verse.ref.toUpperCase()}
          </p>
        </motion.div>

        <div className="mt-20">
          <h2 className="font-script text-3xl italic text-gold-gradient md:text-4xl">
            Leave Your Blessings
          </h2>
          <p className="mx-auto mt-4 max-w-sm font-script text-lg italic leading-relaxed ink-soft">
            Your prayers and wishes mean the world to us.
          </p>
          <div className="divider-hairline mt-6" />
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
          className="card-premium mt-10 p-7 text-left"
        >
          {sent ? (
            <p className="text-center font-script text-xl italic ink">
              Your blessing has been recorded. Thank you for praying with us ✦
            </p>
          ) : (
            <>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                maxLength={80}
                className="h-12 w-full rounded-xl border border-[oklch(0.72_0.09_80)]/40 bg-white/80 px-4 font-body text-base ink outline-none placeholder:text-[oklch(0.55_0.03_60)]/60 focus:border-[oklch(0.72_0.09_80)]"
              />
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="A prayer or wish for Rithin & Harshita…"
                rows={4}
                maxLength={500}
                className="mt-3 w-full rounded-xl border border-[oklch(0.72_0.09_80)]/40 bg-white/80 px-4 py-3 font-body text-base leading-relaxed ink outline-none placeholder:text-[oklch(0.55_0.03_60)]/60 focus:border-[oklch(0.72_0.09_80)]"
              />
              {error && (
                <p className="mt-3 text-center font-body text-sm text-[oklch(0.45_0.15_25)]">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-5 h-12 w-full rounded-full bg-gradient-to-b from-[#d4b87a] to-[#a07e3a] font-display text-[12px] tracking-[0.28em] text-white shadow-gold transition active:scale-[0.99] disabled:opacity-60"
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