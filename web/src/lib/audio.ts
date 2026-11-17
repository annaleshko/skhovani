/**
 * Pluggable audio source for tour stops.
 * Text-only MVP uses silence; OpenAI TTS can implement this later without UI changes.
 */
export type AudioSource = {
  /** Duration of the clip in seconds (drives the ring when audio is used). */
  durationSec: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  readonly playing: boolean;
};

export function createSilentAudio(durationSec: number): AudioSource {
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    durationSec,
    get playing() {
      return playing;
    },
    play() {
      playing = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        playing = false;
      }, durationSec * 1000);
    },
    pause() {
      playing = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    stop() {
      playing = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
