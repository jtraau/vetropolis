import React, { useEffect, useRef, useState, useCallback } from "react";

const HUD = ({
  money,
  health,
  hunger,
  thirst,
  stamina,
  inventory = [],
  showHotbar,
  dialogue,
  onDialogueNext,
  onDialogueSkip,
  showDonationPanel,
  donationProgress = 0,
  donationTarget = 1,
  onCloseDonationPanel,
  onDonate,
}) => {
  const [showDonateInput, setShowDonateInput] = useState(false);
  const [donateValue, setDonateValue] = useState("");
  const [donateError, setDonateError] = useState("");

  useEffect(() => {
    if (showDonateInput) {
      setDonateValue("");
      setDonateError("");
    }
  }, [showDonateInput]);

  useEffect(() => {
    if (!dialogue?.show && !dialogue?.choice) {
      setShowDonateInput(false);
    }
  }, [dialogue]);

  const remainingTarget = Math.max(0, donationTarget - donationProgress);
  const maxAllowed = Math.max(0, Math.min(money, remainingTarget));
  const quickbarBottom = showHotbar ? 230 : 16;
  const pct = Math.min(
    100,
    Math.max(0, (donationProgress / donationTarget) * 100)
  );

  const handleDonate = () => {
    const n = Math.floor(Number(donateValue));
    if (!n || n <= 0) {
      setDonateError("Nominal tidak valid.");
      return;
    }
    if (n > money) {
      setDonateError("Koin tidak cukup!");
      return;
    }
    if (n > maxAllowed) {
      const reason =
        remainingTarget <= money
          ? `maksimal ${remainingTarget} (sisa target)`
          : `maksimal ${money} (saldo)`;
      setDonateError(`Kelebihan, ${reason}.`);
      return;
    }
    onDonate?.(n);
    setShowDonateInput(false);
    setDonateValue("");
    setDonateError("");
  };

  return (
    <>
      {/* Card Status kiri-bawah */}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 50,
          background: "#fff",
          border: "2px solid rgba(0,0,0,0.15)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minWidth: 200,
          boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          fontWeight: "bold",
          color: "#1b1b1b",
        }}
      >
        {/* Uang */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 20 }}>💰</span>
          <span style={{ fontWeight: 800, color: "#222" }}>{money}🪙</span>
        </div>

        {/* Bar status */}
        <Bar icon="❤️" label="HP" value={health} color="#ef5350" />
        <Bar icon="🍗" label="Lapar" value={hunger} color="#ff7043" />
        <Bar icon="💧" label="Haus" value={thirst} color="#42a5f5" />
        <Bar icon="⚡" label="Stamina" value={stamina} color="#9c27b0" />
      </div>

      {/* Quickbar 1–5 */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: quickbarBottom,
          transform: "translateX(-50%)",
          zIndex: 25,
          display: "flex",
          gap: 8,
          background: "rgba(0, 0, 0, 0.10)",
          border: "2px solid rgba(255, 255, 255, 1)",
          padding: "10px 12px",
          borderRadius: 12,
          boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          transition: "bottom .2s ease",
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            title={inventory[i]?.name || `Slot ${i + 1}`}
            style={{
              width: 52,
              height: 52,
              background: "rgba(0, 0, 0, 0.10)",
              border: "2px solid #bbb",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              color: "#333",
            }}
          >
            {inventory[i] ? inventory[i].emoji : null}
          </div>
        ))}
      </div>

      {/* Dialogue */}
      {!showDonationPanel && dialogue?.show && (
        <DialogueOverlay
          name={dialogue.name}
          text={dialogue.text}
          onNext={onDialogueNext}
          onSkip={onDialogueSkip}
          speedMs={dialogue?.speedMs ?? 60}
          center={!!dialogue.center}
        />
      )}

      {showDonationPanel && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
          }}
          onClick={onCloseDonationPanel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 14,
              minWidth: 300,
              maxWidth: "92vw",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontWeight: 700,
                fontSize: 18,
                color: "black",
              }}
            >
              Donasi Balai Desa
            </h3>
            <div
              style={{
                width: "100%",
                height: 16,
                background: "#eee",
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #ddd",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#4ade80",
                  transition: "width .2s ease",
                }}
              />
            </div>
            <p style={{ margin: "4px 0 12px", color: "#444" }}>
              Terkumpul <b>{donationProgress}</b> dari <b>{donationTarget}</b>{" "}
              koin
            </p>
            <button
              onClick={onCloseDonationPanel}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {!showDonationPanel && dialogue?.choice && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 48,
            transform: "translateX(-50%)",
            zIndex: 1200,
            display: "flex",
            gap: 12,
          }}
        >
          {dialogue.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                if (opt.action === "donate") {
                  setShowDonateInput(true);
                } else {
                  onDialogueNext?.(true, opt.action);
                }
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "3px solid #222",
                color: "black",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
                marginBottom: 60,
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>
      )}

      {showDonateInput && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            backdropFilter: "blur(2px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1300,
          }}
          onClick={() => {
            setShowDonateInput(false);
            setDonateValue("");
            setDonateError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              maxWidth: "92vw",
              background: "#fff",
              border: "3px solid #222", // <- konsisten border tebal
              borderRadius: 12, // <- sama seperti quickbar
              boxShadow: "4px 4px 0 #000", // <- pixel-ish shadow
              padding: 16,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 18,
                marginBottom: 12,
                textAlign: "center",
                color: "black",
              }}
            >
              Setor Donasi
            </div>

            <input
              autoFocus
              type="number"
              min="1"
              max={maxAllowed}
              value={donateValue}
              onChange={(e) => setDonateValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDonate()}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "3px solid #222",
                background: "#f9fafb",
                color: "#111",
                fontWeight: 800,
                outline: "none",
                boxShadow: "inset 0 0 0 2px #fff",
                boxSizing: "border-box",
                marginBottom: 12,
                fontFamily: '"Press Start 2P","VT323",monospace',
              }}
            />
            <div style={{ fontSize: 12, color: "#000000ff", marginBottom: 8 }}>
              Sisa target: <b>{remainingTarget}</b> • Batas setor:{" "}
              <b>{maxAllowed}</b>
            </div>

            {donateError && (
              <div style={{ color: "red", fontWeight: 700, marginBottom: 8 }}>
                {donateError}
              </div>
            )}

            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => {
                  setShowDonateInput(false);
                  setDonateValue("");
                  setDonateError("");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "3px solid #222",
                  background: "#222",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Tidak ada
              </button>
              <button
                onClick={handleDonate}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "3px solid #222",
                  background: "#222",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Setor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Bar = ({ icon, label, value = 0, color }) => {
  const w = Math.min(100, Math.max(0, value));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div
        style={{
          flex: 1,
          height: 12,
          background: "#f1f1f1",
          borderRadius: 6,
          border: "1px solid #ddd",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: color,
            transition: "width .25s ease",
          }}
        />
      </div>
      <span
        style={{
          minWidth: 40,
          textAlign: "right",
          fontWeight: 700,
          color: "#333",
          fontSize: 12,
          fontFamily: "monospace",
        }}
      >
        {Math.round(w)}%
      </span>
    </div>
  );
};

/* ===================== Dialogue Components ===================== */
function useTypewriter(text, speed = 16) {
  const [shown, setShown] = useState("");
  const [typing, setTyping] = useState(false);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    idxRef.current = 0;
    setShown("");
    setTyping(!!text);
    clearTimer();
    if (!text) return;

    timerRef.current = setInterval(() => {
      idxRef.current += 1;
      setShown(text.slice(0, idxRef.current));
      if (idxRef.current >= text.length) {
        clearTimer();
        setTyping(false);
      }
    }, speed);

    return clearTimer;
  }, [text, speed]);

  const done = shown === (text || "");
  const skip = useCallback(() => {
    clearTimer();
    setShown(text || "");
    setTyping(false);
  }, [text]);

  return { shown, done, typing, skip };
}

const DialogueOverlay = ({
  name = "NAME",
  text = "",
  onNext,
  onSkip,
  speedMs = 60,
  center = false, // ✅ default boolean yang benar
}) => {
  const { shown, done, typing, skip } = useTypewriter(text, speedMs);

  const pressLockRef = useRef(false);
  const unlockSoon = () =>
    setTimeout(() => (pressLockRef.current = false), 120);

  useEffect(() => {
    const h = (e) => {
      if (e.repeat || pressLockRef.current) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        pressLockRef.current = true;

        if (typing || !done) {
          skip();
          unlockSoon();
          return;
        }
        onNext?.();
        unlockSoon();
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        pressLockRef.current = true;
        onSkip?.();
        unlockSoon();
      }
    };
    window.addEventListener("keydown", h, { capture: true });
    return () => window.removeEventListener("keydown", h, { capture: true });
  }, [typing, done, skip, onNext, onSkip]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (pressLockRef.current) return;
        pressLockRef.current = true;

        if (typing || !done) {
          skip();
        } else {
          onNext?.();
        }
        unlockSoon();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "grid",
        alignItems: center ? "center" : "end", // ✅ center atau bawah
        justifyItems: "center", // ✅ center horizontal juga
        padding: 16,
        pointerEvents: "auto",
        background: center
          ? "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.45) 100%)"
          : "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)",
      }}
    >
      <div style={{ maxWidth: 900, width: "min(900px, 96vw)" }}>
        <DialogueBox name={name} text={shown} />
      </div>
    </div>
  );
};

export const DialogueBox = ({ name = "NAME", text = "" }) => {
  return (
    <div
      style={{
        position: "relative",
        border: "4px solid #2a1a12", // tebal, pixelated
        background: "linear-gradient(#2094f3ff, #ffffffff)", // retro parchment
        padding: "20px",
        borderRadius: 0, // kotak biar pixel feel
        boxShadow: "4px 4px 0 #000", // drop shadow tegas
        fontFamily: '"Press Start 2P","VT323",monospace',
        imageRendering: "pixelated",
      }}
    >
      {/* name plate */}
      <div
        style={{
          position: "absolute",
          top: -25,
          left: 16,
          padding: "4px 10px",
          background: "#2b2018",
          color: "#ffffffff",
          border: "3px solid #000",
          fontSize: 20,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {name?.toUpperCase?.() || "NAME"}
      </div>

      <p
        style={{
          margin: 0,
          color: "#2a1a12",
          lineHeight: 1.5,
          fontSize: 18,
          letterSpacing: 1,
          textTransform: "none",
          fontWeight: "bold",
        }}
      >
        {text || "…"}
      </p>
    </div>
  );
};

const btn = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #555",
  background: "#2b2b2b",
  color: "#ffffffff",
  cursor: "pointer",
  fontFamily: "monospace",
};

export default HUD;
