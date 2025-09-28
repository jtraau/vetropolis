// hooks/useRafLoop.jsx
import { useEffect, useLayoutEffect, useRef } from "react";
/**
 * Panggil cb(dtInSeconds) pada setiap frame lewat requestAnimationFrame.
 * - Tidak pernah memanggil cb saat render (sinkron).
 * - Tidak re-setup loop saat cb berubah (pakai ref).
 * - Ada clamp dt dan guard agar tidak double-run.
 */
export default function useRafLoop(
  cb,
  { clampDelta = 0.05, enabled = true } = {}
) {
  const cbRef = useRef(cb);
  const rafIdRef = useRef(null);
  const lastRef = useRef(0);
  const runningRef = useRef(false);

  // selalu pakai cb terbaru tanpa re-mount effect
  useLayoutEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const tick = (now) => {
      if (!mounted) return;

      // guard: jangan jalankan dua kali dalam satu frame/render
      if (runningRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }
      runningRef.current = true;

      const last = lastRef.current || now;
      let dt = (now - last) / 1000;
      lastRef.current = now;
      if (dt > clampDelta) dt = clampDelta;

      try {
        const fn = cbRef.current;
        if (typeof fn === "function") fn(dt);
      } finally {
        runningRef.current = false;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    lastRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      mounted = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      runningRef.current = false;
    };
  }, [enabled, clampDelta]);
}
