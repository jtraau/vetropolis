import React, { useState, useEffect, useRef } from "react";
import Gameplay from "./Gameplay";
import { DIALOGUE } from "./core/entities";
import Cutscene from "./components/Cutscene";
import { resetClinicEngine } from "./scenes/ClinicScene";

import menuBg from "./assets/menu/menu.jpg"; // background menu full-screen
import logo from "./assets/menu/logo.png"; // logo vetropolis

import menuBgm from "./assets/sfx/menu-bgm.mp3";

const Home = () => {
  // audio
  const [volume, setVolume] = useState(100);
  const [soundOn, setSoundOn] = useState(true);
  const [lastVolume, setLastVolume] = useState(100);

  // ui
  const [isMobile, setIsMobile] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("audio"); // "audio" | "tutorial"
  const [isStarted, setIsStarted] = useState(false);
  const [selected, setSelected] = useState(0);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showCutscene, setShowCutscene] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    const checkMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    );
    setIsMobile(checkMobile);
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const MAX_MENU_VOL = 0.4; // mapping 0–100 slider -> 0–0.6 (sesuai preferensimu)
    const vol = Math.max(
      0,
      Math.min(1, (soundOn && volume > 0 ? volume / 100 : 0) * MAX_MENU_VOL)
    );
    a.volume = vol;
    const shouldPlay = !isStarted && !showCutscene && vol > 0;
    if (shouldPlay) {
      a.loop = true;
      a.play().catch(() => {});
    } else {
      a.pause();
      a.currentTime = 0;
    }
  }, [isStarted, showCutscene, soundOn, volume]);

  const slides = DIALOGUE.opening.map(({ img, name, text }) => ({
    img,
    name,
    text,
  }));

  // animasi tutup settings
  const closeSettings = () => {
    setSettingsClosing(true);
    setTimeout(() => {
      setShowSettings(false);
      setSettingsClosing(false);
    }, 200); // cocokkan dengan @keyframes popOut
  };

  const handleVolume = (v) => {
    const val = Number(v);
    setVolume(val);
    setSoundOn(val > 0);
    if (val > 0) setLastVolume(val);
  };

  const exit = () => {
    if (
      window.opener ||
      window.matchMedia?.("(display-mode: standalone)").matches
    ) {
      window.close();
      return;
    }
    window.location.href = "https://www.bing.com/";
  };

  // Fade saat Start
  const startWithFade = () => {
    if (isStarting) return;
    setIsStarting(true);
    setTimeout(() => {
      setShowCutscene(true);
      setTimeout(() => setIsStarting(false), 0);
    }, 480);
  };

  // ===== Menu items + keyboard navigation =====
  const MENU = [
    { label: "START GAME", action: startWithFade },
    {
      label: "SETTINGS",
      action: () => {
        setSettingsTab("audio");
        setShowSettings(true);
      },
    },
    { label: "EXIT", action: () => exit() },
  ];

  useEffect(() => {
    if (isStarted) return; // saat in-game, biar Gameplay yang handle
    const onKey = (e) => {
      audioRef.current?.play?.().catch(() => {});
      if (showSettings) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeSettings();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => (i + 1) % MENU.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i - 1 + MENU.length) % MENU.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = MENU[selected];
        item?.action?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStarted, showSettings, selected, MENU, closeSettings, audioRef]);

  // keycap putih yang blend sama modal
  const Key = ({ children }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 26,
        padding: "0 8px",
        borderRadius: 8,
        background: "#fff",
        border: "1px solid #d9e1ee",
        boxShadow: "0 1px 0 rgba(0,0,0,.04), inset 0 -1px 0 rgba(0,0,0,.06)",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
        fontSize: 12,
        fontWeight: 700,
        color: "#111",
        lineHeight: "26px",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );

  const Paw = ({ size = 18 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: "block" }}
    >
      <circle
        cx="7"
        cy="8"
        r="3"
        fill="#f6c177"
        stroke="#704214"
        strokeWidth="1.5"
      />
      <circle
        cx="17"
        cy="8"
        r="3"
        fill="#f6c177"
        stroke="#704214"
        strokeWidth="1.5"
      />
      <circle
        cx="10"
        cy="4.5"
        r="2.2"
        fill="#f6c177"
        stroke="#704214"
        strokeWidth="1.5"
      />
      <circle
        cx="14"
        cy="4.5"
        r="2.2"
        fill="#f6c177"
        stroke="#704214"
        strokeWidth="1.5"
      />
      <path
        d="M7 15c0-2.5 10-2.5 10 0 0 3-3 5-5 5s-5-2-5-5z"
        fill="#f6c177"
        stroke="#704214"
        strokeWidth="1.5"
      />
    </svg>
  );

  const PawTrail = ({ where = "top" }) => {
    const base = {
      position: "absolute",
      left: -8,
      right: -8,
      height: 140,
      pointerEvents: "none",
      zIndex: 0, // di atas glass, di bawah konten
    };
    const pos = where === "top" ? { top: -260 } : { bottom: -260 };

    // titik-titik paw (diagonal lembut)
    const dots =
      where === "top"
        ? [
            { x: 50, y: 180, r: -15, s: 60, o: 1 },
            { x: 130, y: 100, r: 10, s: 60, o: 1 },
            { x: 240, y: 170, r: -5, s: 60, o: 1 },
            { x: 320, y: 90, r: 12, s: 60, o: 1 },
          ]
        : [
            { x: 50, y: -40, r: -15, s: 60, o: 1 },
            { x: 130, y: -100, r: 10, s: 60, o: 1 },
            { x: 240, y: -30, r: -5, s: 60, o: 1 },
            { x: 320, y: -90, r: 12, s: 60, o: 1 },
          ];

    return (
      <div style={{ ...base, ...pos }}>
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x,
              top: d.y,
              opacity: d.o,
              transform: `rotate(${d.r}deg)`,
              filter: "drop-shadow(0 1px 0 #000)",
            }}
          >
            <Paw size={d.s} />
          </div>
        ))}
      </div>
    );
  };

  return isStarted ? (
    <Gameplay
      initialSpawn={{ location: "house", x: 7, y: 8 }}
      soundOn={soundOn && volume > 0}
      volume={Math.max(0, Math.min(1, volume / 100))}
      onExit={() => {
        resetClinicEngine();
        setIsStarted(false);
        setIsStarting(false);
      }}
    />
  ) : showCutscene ? (
    <Cutscene
      slides={slides}
      typeSpeedMs={70}
      onComplete={() => {
        setShowCutscene(false);
        setIsStarted(true); // selesai cutscene → masuk gameplay
      }}
    />
  ) : (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "#111",
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        fontFamily: "sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <audio ref={audioRef} src={menuBgm} preload="auto" />

      {/* Fade overlay saat start */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#000",
          opacity: isStarting ? 1 : 0,
          transition: "opacity 480ms ease",
          pointerEvents: "none",
          zIndex: 999,
        }}
      />

      {/* FULLSCREEN BACKGROUND */}
      <img
        src={menuBg}
        draggable={false}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.82)",
          userSelect: "none",
          pointerEvents: "none",
          zIndex: 0,
        }}
        alt=""
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.35) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* CARD 16:9 */}
      <div
        style={{
          position: "relative",
          width: "80vw",
          maxWidth: 900,
          aspectRatio: "16 / 9",
          borderRadius: 24,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          overflow: "visible",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          zIndex: 1,
        }}
      >
        {/* SETTINGS POPUP (rapih, tetap putih) */}
        {(showSettings || settingsClosing) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div
              role="dialog"
              aria-modal
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                color: "#111",
                borderRadius: 16,
                padding: 20,
                width: 520,
                maxWidth: "90%",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                position: "relative",
                border: "1px solid #e9eef3",
                // ⬇️ animasi in/out
                animation: settingsClosing
                  ? "popOut 200ms ease forwards"
                  : "popIn 220ms cubic-bezier(.2,.7,.2,1) forwards",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: "1px solid #eef2f7",
                }}
              >
                <h3 style={{ margin: 0, fontWeight: 800, letterSpacing: 0.5 }}>
                  Settings
                </h3>
                <button
                  onClick={closeSettings}
                  aria-label="Close"
                  title="Close"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 20,
                  }}
                >
                  ❌
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => setSettingsTab("audio")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #cfd7e3",
                    background: settingsTab === "audio" ? "#2196f3" : "#fff",
                    color: settingsTab === "audio" ? "#fff" : "#111",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Audio
                </button>
                <button
                  onClick={() => setSettingsTab("tutorial")}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #cfd7e3",
                    background:
                      settingsTab === "tutorial" ? "#2094f3ff" : "#fff",
                    color: settingsTab === "tutorial" ? "#fff" : "#111",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Tutorial
                </button>
              </div>

              {/* Panels */}
              {settingsTab === "audio" ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>Sound</div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        onClick={() => {
                          if (soundOn && volume > 0) {
                            setSoundOn(false);
                            setLastVolume(volume);
                            setVolume(0);
                          } else {
                            setSoundOn(true);
                            setVolume(lastVolume || 100);
                          }
                        }}
                        title={soundOn && volume > 0 ? "Mute" : "Unmute"}
                        style={{
                          fontSize: 18,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        {soundOn && volume > 0 ? "🔊" : "🔇"}
                      </span>
                      <input
                        className="wrange"
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={(e) => handleVolume(e.target.value)}
                      />
                      <span style={{ width: 40, textAlign: "right" }}>
                        {volume}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: "0 0 12px 0", textAlign: "center" }}>
                    Tutorial Bermain
                  </h4>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    {[
                      [
                        "Gerak",
                        <span>
                          <Key>W</Key>&nbsp;/&nbsp;<Key>A</Key>&nbsp;/&nbsp;
                          <Key>S</Key>&nbsp;/&nbsp;<Key>D</Key>
                        </span>,
                      ],
                      [
                        "Interaksi dan Mengobati",
                        <span>
                          <Key>E</Key>
                        </span>,
                      ],
                      [
                        "Inventory",
                        <span>
                          <Key>Tab</Key>
                        </span>,
                      ],
                      [
                        "Hotbar",
                        <span>
                          <Key>1</Key> <Key>2</Key> <Key>3</Key> <Key>4</Key>{" "}
                          <Key>5</Key>
                        </span>,
                      ],
                      ["Panggil pasien", <Key>Q</Key>],
                      [
                        "Konsumsi (Makan/Minum)",
                        <span>
                          <Key>F</Key>/<Key>G</Key>
                        </span>,
                      ],
                      ["Drag & Drop", "Geser item untuk pindah/buang"],
                    ].map(([label, content]) => (
                      <li
                        key={label}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 1fr",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span style={{ color: "#6b7280" }}>{label}</span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {content}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {isMobile && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 12,
              pointerEvents: "none",
            }}
          >
            <div
              role="dialog"
              aria-modal
              style={{
                pointerEvents: "auto",
                background: "#ffffff",
                color: "#111",
                borderRadius: 16,
                padding: 20,
                width: 420,
                maxWidth: "90%",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                position: "relative",
                border: "1px solid #e9eef3",
                animation: "popIn 220ms cubic-bezier(.2,.7,.2,1) forwards",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: "1px solid #eef2f7",
                }}
              >
                <h3 style={{ margin: 0, fontWeight: 800, letterSpacing: 0.5 }}>
                  Perhatian
                </h3>
                <button
                  onClick={() => setIsMobile(false)}
                  aria-label="Tutup"
                  title="Tutup"
                  style={{
                    width: 32,
                    height: 32,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 18,
                    border: "none",
                  }}
                >
                  ❌
                </button>
              </div>

              <p style={{ margin: 0, lineHeight: "20px" }}>
                Game ini optimal dimainkan di <b>PC/Laptop</b> dengan keyboard:
                <br />
                WASD/Arrow untuk bergerak, <b>E</b> untuk interaksi,{" "}
                <b>Spasi</b> untuk aksi tertentu.
              </p>

              <button
                onClick={() => setIsMobile(false)}
                style={{
                  marginTop: 14,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "2px solid #222",
                  background: "#eee",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                OK, mengerti
              </button>
            </div>
          </div>
        )}

        {/* ===== Panel kanan (card + logo + tombol) — DIPINDAH LEBIH KANAN ===== */}
        <div
          style={{
            position: "absolute",
            right: "-200px", // ⬅️ geser paket card+tombol lebih kanan
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
          }}
        >
          {/* Wrapper panel punya background card di belakang konten */}
          <div
            style={{
              position: "relative",
              width: "min(400px, 44vw)",
            }}
          >
            {/* Glass card BACKGROUND (tanpa teks) */}
            <div
              style={{
                position: "absolute",
                top: -300,
                bottom: -300,
                left: -8,
                right: -8,
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255,255,255,0.35)",
                backdropFilter: "blur(6px)",
                borderRadius: 16,
                boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                zIndex: 0,
              }}
            />
            {/* ⬇️ Tambah trail ATAS (di atas logo) */}
            <PawTrail where="top" />
            {/* Konten di atas card */}
            <div style={{ position: "relative", zIndex: 1, padding: 12 }}>
              {/* LOGO */}
              <img
                src={logo}
                draggable={false}
                style={{
                  width: "100%",
                  maxWidth: 500,
                  height: "auto",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                alt="Vetropolis"
              />

              {/* Buttons */}
              {/* Menu list — pixel retro */}
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "grid",
                  gap: 10,
                }}
              >
                {MENU.map((m, i) => (
                  <li
                    key={m.label}
                    onMouseEnter={() => setSelected(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                    }}
                  >
                    {/* Cursor */}
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        display: "grid",
                        placeItems: "center",
                        opacity: i === selected ? 1 : 0,
                        transition: "opacity .12s",
                        filter: "drop-shadow(0 1px 0 #000)",
                        animation:
                          i === selected
                            ? "paw-bob .9s ease-in-out infinite"
                            : "none",
                      }}
                    >
                      <Paw size={18} />
                    </span>

                    {/* Button text */}
                    <button
                      onClick={m.action}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: "6px 10px",
                        width: "100%",
                        textAlign: "left",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                        fontWeight: 900,
                        fontSize: 20,
                        color: i === selected ? "#a3baffff" : "#ffffffff",
                        textShadow:
                          "0 2px 0 #000, 2px 0 0 #000, -2px 0 0 #000, 0 -2px 0 #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000",
                        filter: i === selected ? "brightness(1.08)" : "none",
                      }}
                    >
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* ⬇️ Tambah trail BAWAH (di bawah EXIT) */}
            <PawTrail where="bottom" />
          </div>
        </div>
        {/* ===== end panel kanan ===== */}
      </div>
      <style>{`
@keyframes paw-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1px) } }

/* slider putih dengan aksen biru (#2196f3) */
.wrange{
  width:100%;
  appearance:none;
  height:6px;
  border-radius:999px;
  background:#e9eef3;
  outline:none;
}
.wrange::-webkit-slider-thumb{
  appearance:none;
  width:16px;height:16px;border-radius:50%;
  background:#2196f3;border:2px solid #fff;
  box-shadow:0 0 0 1px #cfd7e3;cursor:pointer;
}
.wrange::-moz-range-thumb{
  width:16px;height:16px;border-radius:50%;
  background:#2196f3;border:2px solid #fff;
  box-shadow:0 0 0 1px #cfd7e3;cursor:pointer;
}
.wrange::-moz-range-track{height:6px;border-radius:999px;background:#e9eef3;}

/* Animasi modal settings */
@keyframes popIn {
  from { opacity: 0; transform: scale(.96) translateY(6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes popOut {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to   { opacity: 0; transform: scale(.96) translateY(6px); }
}
`}</style>
    </div>
  );
};

export default Home;
