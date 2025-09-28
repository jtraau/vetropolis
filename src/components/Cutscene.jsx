import React, { useEffect, useRef, useState, useCallback } from "react";
import { DialogueBox } from "./HUD";
// ===== Typewriter helper
function useTypewriter(text, speed = 18, isPaused = false) {
  const [shown, setShown] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    setShown("");
    idxRef.current = 0;
  }, [text]);

  useEffect(() => {
    if (!text || isPaused) return;
    const id = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, isPaused]);

  const skip = useCallback(() => {
    idxRef.current = text.length;
    setShown(text);
  }, [text]);

  const done = shown === text;
  return { shown, done, skip };
}

// ====== Cutscene
const Cutscene = ({
  slides = [],
  onComplete,
  keyNext = [" ", "Enter"],
  keySkip = ["Escape"],
  autoAdvanceMs = 0,
  typeSpeedMs = 60,
}) => {
  const [i, setI] = useState(0);
  const cur = slides[i] ?? {};
  const charSpeed = cur.speedMs ?? typeSpeedMs;
  const { shown, done, skip } = useTypewriter(cur.text || "", charSpeed);

  // next logic
  const goNext = useCallback(() => {
    if (!done) {
      skip();
      return;
    }
    if (i < slides.length - 1) setI(i + 1);
    else onComplete?.();
  }, [done, i, slides.length, onComplete, skip]);

  // keyboard
  useEffect(() => {
    const h = (e) => {
      if (keyNext.includes(e.key)) {
        e.preventDefault();
        goNext();
      }
      if (keySkip.includes(e.key)) {
        e.preventDefault();
        onComplete?.();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [goNext, keyNext, keySkip, onComplete]);

  // auto advance
  useEffect(() => {
    if (!autoAdvanceMs || !done) return;
    const t = setTimeout(goNext, autoAdvanceMs);
    return () => clearTimeout(t);
  }, [done, autoAdvanceMs, goNext, i]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#111",
        overflow: "hidden",
        imageRendering: "pixelated",
        zIndex: 9999,
      }}
      onClick={goNext}
    >
      {/* Layer 1: gambar */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: "#222",
          zIndex: 0,
        }}
      >
        {cur.img && (
          <img
            src={cur.img}
            alt=""
            draggable={false}
            style={{
              imageRendering: "pixelated",
              objectFit: "contain", // bisa "cover" sesuai selera
              width: "100%",
              height: "100%",
            }}
          />
        )}
      </div>

      {/* Layer 2: overlay dialog */}
      {(() => {
        const isCentered = !!cur.center || !cur.img; // 👈 aturan center
        return (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 5,
              display: "grid",
              alignItems: isCentered ? "center" : "end",
              justifyItems: "center",
              padding: 12,
              background: isCentered
                ? "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)"
                : "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.35) 100%)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "min(900px, 96vw)",
                pointerEvents: "auto",
              }}
            >
              <DialogueBox name={cur.name || "NARRATOR"} text={shown || "…"} />
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const btn = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #555",
  background: "#2b2b2b",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "monospace",
};

export default Cutscene;
