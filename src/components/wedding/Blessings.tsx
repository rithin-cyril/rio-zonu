import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Ornament } from "./Ornament";
import { useServerFn } from "@tanstack/react-start";
import { getApprovedBlessings, getBlessings, moderateBlessing, submitBlessing } from "@/lib/blessings.functions";

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
  const fetchApproved = useServerFn(getApprovedBlessings);
  const moderate = useServerFn(moderateBlessing);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [approved, setApproved] = useState<Array<{ id: string; name: string; note: string; approved_at: string | null }>>([]);

  useEffect(() => {
    fetchApproved()
      .then((r) => setApproved(r.blessings))
      .catch(() => {});
  }, [fetchApproved]);

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

  const refreshApproved = () => {
    fetchApproved()
      .then((r) => setApproved(r.blessings))
      .catch(() => {});
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
      refreshApproved();
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

        {approved.length > 0 && (
          <div className="mt-8 space-y-4 text-left">
            {approved.map((b) => (
              <div
                key={b.id}
                className="rounded-md border border-gold/40 bg-white/90 p-4 shadow-gold backdrop-blur"
              >
                <p className="font-display text-[10px] font-semibold tracking-[0.35em] text-gold-gradient">
                  — {b.name.toUpperCase()}
                </p>
                <p className="mt-2 font-script text-base italic leading-relaxed ink">
                  “{b.note}”
                </p>
              </div>
            ))}
          </div>
        )}

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
          className="mt-8 rounded-md border border-gold/50 bg-white/90 p-6 text-left shadow-gold backdrop-blur md:mt-10 md:p-7"
        >
          <p className="font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient">
            LEAVE A BLESSING FOR THE COUPLE
          </p>
          {sent ? (
            <p className="mt-4 font-script text-lg italic ink">
              Your wishes have been received with joy and gratitude. Thank you for being part of our story.
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

        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="mt-6 inline-block rounded border border-gold/60 px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10"
        >
          VIEW BLESSINGS
        </button>
      </div>

      {viewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm">
          <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-md border border-gold/60 bg-[oklch(0.97_0.012_90)] shadow-gold">
            <button
              type="button"
              onClick={closeView}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full border border-gold/50 bg-white/90 px-2 py-0.5 font-display text-xs text-gold-gradient hover:bg-gold/10"
            >
              ✕
            </button>
            <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
              <p className="text-center font-display text-[10px] tracking-[0.45em] text-gold-gradient">
                ✦  BLESSINGS RECEIVED  ✦
              </p>
              <h3 className="mt-2 text-center font-script text-2xl italic text-gold-gradient md:text-3xl">
                Prayers for the Couple
              </h3>
              <Ornament className="mt-4" />

              {blessings === null ? (
                <form onSubmit={handleUnlock} className="mt-6">
                  <label className="block text-center font-display text-[11px] tracking-[0.35em] ink-soft">
                    ENTER PASSCODE
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    maxLength={20}
                    className="mx-auto mt-3 block w-40 border-b border-gold/60 bg-transparent py-2 text-center font-display text-lg tracking-[0.5em] ink outline-none focus:border-gold"
                  />
                  {listError && (
                    <p className="mt-3 text-center font-script italic text-sm text-[oklch(0.45_0.15_25)]">
                      {listError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={loadingList || !passcode}
                    className="mx-auto mt-6 block rounded border border-gold px-6 py-2.5 font-display text-[11px] font-semibold tracking-[0.4em] text-gold-gradient transition hover:bg-gold/10 disabled:opacity-50"
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