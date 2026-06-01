import { motion } from "motion/react";

const events = [
  {
    title: "Holy Matrimony",
    date: "Sunday, 18 October 2026",
    time: "9:00 AM",
    venue: "CSI Kanthi Church",
    address: "Anandapura, S. Coorg, Karnataka",
    map: "https://www.google.com/maps/search/CSI+Kanthi+Church+Anandapura+Coorg",
  },
  {
    title: "Wedding Reception",
    date: "Sunday, 18 October 2026",
    time: "12:00 Noon onwards",
    venue: "Church Hall",
    address: "Siddapura, S. Coorg, Karnataka",
    map: "https://www.google.com/maps/search/CSI+Church+Hall+Siddapura+Coorg",
  },
];

export function Ceremonies() {
  return (
    <section className="bg-ivory-soft relative overflow-hidden py-24">
      <div className="mx-auto max-w-xl px-6 text-center">
        <h2 className="font-script text-3xl italic text-gold-gradient md:text-4xl">
          The Blessed Day
        </h2>
        <div className="divider-hairline mt-6" />

        <div className="mt-12 flex flex-col gap-8">
          {events.map((e, i) => (
            <motion.div
              key={e.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="card-premium px-7 py-8 text-center"
            >
              <h3 className="font-script text-2xl italic text-gold-gradient md:text-3xl">
                {e.title}
              </h3>
              <div className="divider-hairline mt-5" />

              <div className="mt-6 space-y-2 text-base ink">
                <p className="font-body">{e.date}</p>
                <p className="font-script text-xl italic text-gold-gradient">
                  {e.time}
                </p>
              </div>

              <div className="mt-6 space-y-1">
                <p className="font-display text-base tracking-[0.1em] ink">
                  {e.venue}
                </p>
                <p className="font-script text-base italic ink-soft">
                  {e.address}
                </p>
              </div>

              <a
                href={e.map}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-b from-[#d4b87a] to-[#a07e3a] px-6 font-display text-[11px] tracking-[0.28em] text-white shadow-gold transition active:scale-[0.98]"
              >
                OPEN IN MAPS
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}