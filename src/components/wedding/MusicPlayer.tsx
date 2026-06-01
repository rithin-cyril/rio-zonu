import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import song from "@/assets/wedding-song.mp3";

const STORAGE_KEY = "wedding-music-muted";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.55;
    audio.muted = muted;
    if (!muted) {
      audio.play().catch(() => {
        /* autoplay blocked – will start on next user interaction */
      });
    }
    window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  }, [muted]);

  return (
    <>
      <audio ref={audioRef} src={song} loop preload="auto" />
      <motion.button
        type="button"
        aria-label={muted ? "Unmute music" : "Mute music"}
        onClick={() => setMuted((m) => !m)}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={{ duration: 0.6 }}
        className="fixed right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-[oklch(0.72_0.09_80)]/50 bg-white/90 shadow-gold backdrop-blur md:right-6 md:top-6"
      >
        {muted ? (
          <VolumeX className="h-4 w-4 text-[oklch(0.52_0.09_72)]" strokeWidth={1.6} />
        ) : (
          <Volume2 className="h-4 w-4 text-[oklch(0.52_0.09_72)]" strokeWidth={1.6} />
        )}
      </motion.button>
    </>
  );
}