// Tiny client-side bus so the gallery video player can duck the background
// wedding music without either component importing the other.
type Cmd = "pause-for-video" | "resume-after-video";

const listeners = new Set<(cmd: Cmd) => void>();

export function onMusicCommand(fn: (cmd: Cmd) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(cmd: Cmd) {
  listeners.forEach((fn) => fn(cmd));
}

export const musicBus = {
  pauseForVideo: () => emit("pause-for-video"),
  resumeAfterVideo: () => emit("resume-after-video"),
};
