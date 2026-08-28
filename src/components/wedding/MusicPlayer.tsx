import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import song from "@/assets/wedding-song.mp3";
import { onMusicCommand } from "@/lib/music-bus";

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [ducked, setDucked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.55;
    audio.muted = muted;
    if (!muted && !ducked) {
      audio.play().catch(() => {
        /* autoplay blocked – will start on next user interaction */
      });
    } else {
      audio.pause();
    }
  }, [muted, ducked]);

  // Gallery videos take priority over the background music.
  useEffect(
    () =>
      onMusicCommand((cmd) => {
        setDucked(cmd === "pause-for-video");
      }),
    [],
  );


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
        className="fixed right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-gold bg-white/85 shadow-gold backdrop-blur md:right-6 md:top-6 md:h-12 md:w-12"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {muted ? (
          <VolumeX className="h-5 w-5 text-[oklch(0.42_0.1_70)]" strokeWidth={1.6} />
        ) : (
          <Volume2 className="h-5 w-5 text-[oklch(0.42_0.1_70)]" strokeWidth={1.6} />
        )}
      </motion.button>
    </>
  );
}