import { useCallback, useEffect, useRef } from "react";

export default function useChime() {
  const contextRef = useRef(null);

  const ensureContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (contextRef.current) return contextRef.current;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    contextRef.current = ctx;
    return ctx;
  }, []);

  const playChime = useCallback(
    (tone = "info") => {
      const ctx = ensureContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      const tones = {
        success: [880, 660],
        danger: [240, 180],
        info: [560, 430]
      };

      const [startFreq, endFreq] = tones[tone] || tones.info;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(startFreq, now);
      oscillator.frequency.linearRampToValueAtTime(endFreq, now + 0.18);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.6);
    },
    [ensureContext]
  );

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        contextRef.current.close();
        contextRef.current = null;
      }
    };
  }, []);

  return playChime;
}
