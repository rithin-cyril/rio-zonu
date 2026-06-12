import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";
import { useServerFn } from "@tanstack/react-start";
import { getBlessings, moderateBlessing, submitBlessing } from "@/lib/blessings.functions";

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
  const [viewOpen, setViewOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [blessings, setBlessings] = useState<Array<{ id: string; name: string; note: string; created_at: string; approved: boolean; rejected: boolean }> | null>(null);
  const fetchBlessings = useServerFn(getBlessings);
  const sendBlessing = useServerFn(submitBlessing);
  const moderate = useServerFn(moderateBlessing);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!viewOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [viewOpen]);

  useEffect(() => {
    if (!viewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetchBlessings({ data: { passcode } });
      setBlessings(res.blessings);
    } catch (err) {
      setListError("Incorrect passcode. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  const handleModerate = async (id: string, action: "approve" | "hide") => {
    setPendingId(id);
    try {
      await moderate({ data: { passcode, id, action } });
      setBlessings((prev) =>
        prev
          ? prev.map((b) =>
              b.id === id
                ? {
                    ...b,
                    approved: action === "approve",
                    rejected: action === "hide",
                  }
                : b,
            )
          : prev,
      );
      toast.success(action === "approve" ? "Blessing approved" : "Blessing hidden");
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const closeView = () => {
    setViewOpen(false);
    setPasscode("");
    setBlessings(null);
    setListError(null);
  };

  return (
    <section className="bg-lux-warm relative overflow-hidden py-14 md:py-20">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-6">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          ✦  HIS WORD UPON US  ✦
        </p>
        <h2 className="font-script mt-3 text-3xl italic text-gold-gradient md:text-5xl">
          Leave Your Blessings
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-script text-base italic ink-soft md:text-lg">
          Your prayers, blessings, and heartfelt wishes mean the world to us as we begin this beautiful journey together.
        </p>
        <Ornament className="mt-5" />

        <div className="mt-8 space-y-5 text-left">
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
            try {
              await sendBlessing({ data: { name, note } });
            } catch {
              setSubmitting(false);
              setError("Sorry, something went wrong. Please try again.");
              return;
            }
            setSubmitting(false);
            setSent(true);
          }}
          className="mt-8 min-h-[320px] scroll-mt-24 rounded-md border border-gold/50 bg-white/90 p-6 text-left shadow-gold backdrop-blur md:mt-10 md:p-7"
        >
          <p className="font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient">
            LEAVE A BLESSING FOR THE COUPLE
          </p>
          {sent ? (
            <p role="status" aria-live="polite" className="mt-4 font-script text-lg italic ink">
              Your wishes have been received with joy and gratitude. Thank you for being part of our story.
            </p>
          ) : (
            <>
              <label htmlFor="blessing-name" className="sr-only">Your name</label>
              <input
                id="blessing-name"
                name="name"
                autoComplete="name"
                enterKeyHint="next"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your Name"
                maxLength={80}
                className="mt-4 w-full min-h-11 border-b border-gold/50 bg-transparent py-2 font-script text-lg italic ink outline-none placeholder:text-[oklch(0.55_0.03_60)]/70 focus:border-gold"
              />
              <label htmlFor="blessing-note" className="sr-only">Your blessing</label>
              <textarea
                id="blessing-note"
                name="note"
                enterKeyHint="send"
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
                className="mt-6 inline-flex min-h-11 items-center rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
              >
                {submitting ? "SENDING…" : "SEND BLESSING"}
              </button>
            </>
          )}
        </form>

        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="mt-6 inline-flex min-h-11 items-center rounded border border-gold/60 px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10"
        >
          VIEW BLESSINGS
        </button>
      </div>

      {viewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
          onClick={closeView}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blessings-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-md border border-gold/60 bg-[oklch(0.97_0.012_90)] shadow-gold"
          >
            <button
              type="button"
              onClick={closeView}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-gold/50 bg-white/90 font-display text-base text-gold-gradient hover:bg-gold/10"
            >
              ✕
            </button>
            <div className="max-h-[85dvh] overflow-y-auto overscroll-contain p-6 md:p-8">
              <p className="text-center font-display text-[10px] tracking-[0.45em] text-gold-gradient">
                ✦  BLESSINGS RECEIVED  ✦
              </p>
              <h3
                id="blessings-modal-title"
                className="mt-2 text-center font-script text-2xl italic text-gold-gradient md:text-3xl"
              >
                Prayers for the Couple
              </h3>
              <Ornament className="mt-4" />

              {blessings === null ? (
                <form onSubmit={handleUnlock} className="mt-6">
                  <label htmlFor="blessings-passcode" className="block text-center font-display text-[11px] tracking-[0.35em] ink-soft">
                    ENTER PASSCODE
                  </label>
                  <input
                    id="blessings-passcode"
                    name="passcode"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="go"
                    autoFocus
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    maxLength={20}
                    className="mx-auto mt-3 block w-40 min-h-11 border-b border-gold/60 bg-transparent py-2 text-center font-display text-lg tracking-[0.5em] ink outline-none focus:border-gold"
                  />
                  {listError && (
                    <p className="mt-3 text-center font-script italic text-sm text-[oklch(0.45_0.15_25)]">
                      {listError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loadingList || !passcode}
                    className="mx-auto mt-6 inline-flex min-h-11 items-center rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
                  >
                    {loadingList ? "UNLOCKING…" : "UNLOCK"}
                  </button>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  {blessings.length === 0 ? (
                    <p className="text-center font-script italic ink-soft">No blessings yet.</p>
                  ) : (
                    blessings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-md border border-gold/40 bg-white/90 p-4 text-left shadow-gold backdrop-blur"
                      >
                        <p className="font-display text-[10px] font-semibold tracking-[0.35em] text-gold-gradient">
                          — {b.name.toUpperCase()}
                        </p>
                        <p className="mt-2 font-script text-base italic leading-relaxed ink">
                          “{b.note}”
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gold/30 pt-3">
                          <span className="font-display text-[9px] tracking-[0.3em] ink-soft">
                            {b.approved ? "VISIBLE" : b.rejected ? "HIDDEN" : "PENDING"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleModerate(b.id, "approve")}
                              disabled={pendingId === b.id || b.approved}
                              aria-label="Approve blessing"
                              className="inline-flex min-h-11 items-center rounded border border-gold px-4 py-2 font-display text-[10px] font-semibold tracking-[0.3em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
                            >
                              ➕ APPROVE
                            </button>
                            <button
                              type="button"
                              onClick={() => handleModerate(b.id, "hide")}
                              disabled={pendingId === b.id || b.rejected}
                              aria-label="Hide blessing"
                              className="inline-flex min-h-11 items-center rounded border border-gold/60 px-4 py-2 font-display text-[10px] font-semibold tracking-[0.3em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
                            >
                              ➖ HIDE
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}