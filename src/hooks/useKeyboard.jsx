// hooks/useKeyboard.jsx
import { useEffect } from "react";

/**
 * Pasang keydown/keyup global dengan simple API.
 * Taruh semua logic di onDown/onUp (sama seperti yang lo punya).
 */
export default function useKeyboard({ enabled = true, onDown, onUp, ignoreTyping = true } = {}) {
  const shouldIgnore = (e) =>
    ignoreTyping && (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA" || e.target?.isContentEditable);
  useEffect(() => {
    if (!enabled) return;
    const kd = (e) => { if (!shouldIgnore(e)) onDown?.(e); };
    const ku = (e) => { if (!shouldIgnore(e)) onUp?.(e); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [enabled, onDown, onUp, ignoreTyping]);
}