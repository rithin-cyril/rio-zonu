import { motion } from "motion/react";
import { Ornament } from "./Ornament";

const events = [
  {
    n: "01",
    title: "Mappillai Azhaippu & Welcome",
    note: "Welcoming the groom with royal honours and a traditional procession.",
    date: "Friday, 11 December 2026",
    time: "6:00 PM onwards",
    venue: "Sri Rajarajeswari Kalyana Mandapam",
    address: "12 Radhakrishnan Salai, Mylapore, Chennai",
  },
  {
    n: "02",
    title: "Nichayathartham",
    note: "The exchange of vows, rings and blessings between the families.",
    date: "Friday, 11 December 2026",
    time: "8:30 PM onwards",
    venue: "Sri Rajarajeswari Kalyana Mandapam",
    address: "Reception Hall, First Floor",
  },
  {
    n: "03",
    title: "Kashi Yatra & Maalai Maatral",
    note: "Playful customs of the sacred pilgrimage and the exchange of garlands.",
    date: "Saturday, 12 December 2026",
    time: "5:30 AM",
    venue: "Sri Rajarajeswari Kalyana Mandapam",
    address: "Main Mandapam",
  },
  {
    n: "04",
    title: "Muhurtham & Sapthapadi",
    note: "The sacred seven steps around the holy fire — the moment two souls become one.",
    date: "Saturday, 12 December 2026",
    time: "7:42 AM",
    venue: "Sri Rajarajeswari Kalyana Mandapam",
    address: "Main Mandapam",
  },
  {
    n: "05",
    title: "Reception & Aashirvaad",
    note: "An evening of feasting, music and blessings from cherished friends and family.",
    date: "Saturday, 12 December 2026",
    time: "7:00 PM onwards",
    venue: "Sri Rajarajeswari Kalyana Mandapam",
    address: "Garden Lawn",
  },
];

export function Ceremonies() {
  return (
    <section className="bg-royal relative overflow-hidden py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="font-display text-[10px] tracking-[0.45em] text-gold-gradient">
          AUSPICIOUS SCHEDULE
        </p>
        <h2 className="font-display mt-4 text-3xl tracking-[0.25em] text-gold-gradient md:text-5xl">
          WEDDING CEREMONIES
        </h2>
        <Ornament className="mt-6" />

        <div className="relative mt-20">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[oklch(0.72_0.11_80)]/50 to-transparent" />

          <div className="space-y-16">
            {events.map((e, i) => (
              <motion.div
                key={e.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold bg-[oklch(0.82_0.14_85)] shadow-gold" />

                <div
                  className={`mx-auto max-w-md rounded border border-gold/40 bg-[oklch(0.22_0.09_28)]/60 p-6 text-left backdrop-blur md:max-w-sm ${
                    i % 2 === 0 ? "md:mr-auto md:ml-0" : "md:ml-auto md:mr-0"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[9px] tracking-[0.4em] text-[oklch(0.78_0.1_80)]">
                      CEREMONY
                    </span>
                    <span className="font-display text-[10px] tracking-[0.3em] text-gold-gradient">
                      {e.n}
                    </span>
                  </div>
                  <h3 className="font-script mt-3 text-2xl italic text-gold-gradient">
                    {e.title}
                  </h3>
                  <p className="mt-2 font-script italic text-[oklch(0.85_0.05_90)]/80">
                    “{e.note}”
                  </p>

                  <div className="mt-4 space-y-1.5 border-t border-gold/30 pt-4 text-sm text-[oklch(0.9_0.04_85)]">
                    <p>📅 {e.date}</p>
                    <p className="text-gold-gradient">🕒 {e.time}</p>
                    <p className="pt-1 text-[oklch(0.95_0.04_85)]">📍 {e.venue}</p>
                    <p className="text-xs text-[oklch(0.78_0.05_85)]">{e.address}</p>
                  </div>

                  <a
                    href="https://maps.google.com/?q=Sri+Rajarajeswari+Kalyana+Mandapam+Mylapore"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block rounded border border-gold/60 px-4 py-1.5 font-display text-[10px] tracking-[0.3em] text-gold-gradient transition hover:bg-[oklch(0.72_0.11_80)]/10"
                  >
                    GOOGLE MAP LOCATION
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}