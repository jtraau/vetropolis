import React, { useState, useMemo, useRef, useEffect } from "react";
import useView from "../hooks/useView";
import MapLayer from "../components/MapLayer";
import {
  doorOutside,
  clinicDoorOutside,
  npcList,
  shopFood,
  shopMed,
} from "../core/entities";
import { pointRectDistance } from "../core/math";
import outsideImg from "../assets/maps/outside.png";
import roofTopImg from "../assets/components/rooftop-vetro.png";
import treeImg from "../assets/components/tree-vetro.png";
import roofgroImg from "../assets/components/rooftop-grocery.png";
import threeRoofImg from "../assets/components/threeroofhouse.png";

import outsideBgm from "../assets/sfx/outside-bgm.mp3";

const CITIZEN_SPRITES = import.meta.glob("../assets/citizen/*.png", {
  eager: true,
  query: "url",
  import: "default",
});

const getCitizenSprite = (key) => {
  if (!key) return null;
  const withExt = key.endsWith(".png") ? key : `${key}.png`;
  return CITIZEN_SPRITES[`../assets/citizen/${withExt}`] ?? null;
};

const Abs = ({ x, y, w, h, style = {}, children, toPxX, toPxY, title }) => (
  <div
    title={title}
    style={{
      position: "absolute",
      transform: `translate3d(${toPxX(x)}px, ${toPxY(y)}px, 0)`,
      width: w ?? undefined,
      height: h ?? undefined,
      willChange: "transform",
      ...style,
    }}
  >
    {children}
  </div>
);

export default function OutsideScene({
  player,
  zoom = 1,
  spriteSrc,
  visualW = 32,
  visualH = 48,
  teleports = [],
  onTeleport = () => {},
  disableTeleports = false,
  ranges = {},
  bgmVolume = 1.0,
  soundOn = true,
}) {
  const [cooldownId, setCooldownId] = useState(null);

  const [rooftopPos, setRooftopPos] = useState({ x: 16.4, y: 12.8 });
  const [treePos, setTreePos] = useState({ x: 2.15, y: 14.3 });
  const [groPos, setRoofgroPos] = useState({ x: 6.4, y: 15.5 });
  const [TroofPos, setRoofthreePos] = useState({ x: 28.5, y: 14.8 });

  const bgmRef = useRef(null);
  // MODE FOLLOW: kirim player + zoom ke useView (khusus outside)
  const { cell, worldW, worldH, worldTransform, playerPx, playerPy } = useView({
    location: "outside",
    player,
    zoom,
  });
  // Konversi grid → pixel (WORLD space pakai cell dari map aktif)
  const toPxX = (gx) => gx * cell;
  const toPxY = (gy) => gy * cell;

  // Ukuran elemen berbasis jumlah tile → pixel WORLD
  const tw = (tiles) => tiles * cell;
  const th = (tiles) => tiles * cell;

  const fadeTo = (audio, target, ms = 300) => {
    if (!audio) return;
    const start = audio.volume ?? 0;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      audio.volume = start + (target - start) * p;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  useEffect(() => {
    if (disableTeleports) return;
    if (!player || player.x == null || player.y == null) return;
    const hit = teleports.find(
      (t) =>
        player.x >= t.x &&
        player.x < t.x + t.w &&
        player.y >= t.y &&
        player.y < t.y + t.h
    );

    if (!hit) {
      if (cooldownId !== null) setCooldownId(null);
      return;
    }
    if (cooldownId === hit.id) return;

    setCooldownId(hit.id);
    onTeleport({
      id: hit.id,
      from: { x: player.x, y: player.y },
      to: { x: hit.tx, y: hit.ty },
    });
  }, [
    player?.x,
    player?.y,
    teleports,
    cooldownId,
    onTeleport,
    disableTeleports,
  ]);

  const OUTSIDE_BGM_KEY = "__vetroOutsideBgm";
  useEffect(() => {
    if (typeof window !== "undefined" && window[OUTSIDE_BGM_KEY]) {
      try {
        window[OUTSIDE_BGM_KEY].pause();
        window[OUTSIDE_BGM_KEY].src = "";
        window[OUTSIDE_BGM_KEY].load?.();
      } catch {}
      window[OUTSIDE_BGM_KEY] = null;
    }
    const a = new Audio(outsideBgm);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    bgmRef.current = a;
    if (typeof window !== "undefined") window[OUTSIDE_BGM_KEY] = a;
    a.play()
      .then(() => {
        const target =
          (soundOn ? Math.max(0, Math.min(0.2, bgmVolume)) : 0) * 0.8;
        fadeTo(a, target, 400);
      })
      .catch(() => {});
    return () => {
      const ref = bgmRef.current;
      if (ref) {
        try {
          ref.pause();
          ref.src = "";
          ref.load?.();
        } catch {}
      }
      if (typeof window !== "undefined" && window[OUTSIDE_BGM_KEY] === ref) {
        window[OUTSIDE_BGM_KEY] = null;
      }
      bgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = bgmRef.current;
    if (!a) return;
    const target = (soundOn ? Math.max(0, Math.min(0.2, bgmVolume)) : 0) * 0.8;
    fadeTo(a, target, 160);
  }, [bgmVolume, soundOn]);

  const interactables = useMemo(() => {
    const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    const doors = [
      ...asArray(doorOutside).map((r) => ({
        ...r,
        type: "door",
        hint: "Ke Rumah",
        ranges: ranges?.door,
      })),
      ...asArray(clinicDoorOutside).map((r) => ({
        ...r,
        type: "door",
        hint: "Ke Klinik",
        ranges: ranges?.door,
      })),
    ];
    const shops = [
      ...asArray(shopFood).map((r) => ({
        ...r,
        type: "shop",
        hint: "Warung",
        ranges: ranges?.shop,
      })),
      ...asArray(shopMed).map((r) => ({
        ...r,
        type: "shop",
        hint: "Toko Obat",
        ranges: ranges?.shop,
      })),
    ];
    const npcs = asArray(npcList).map((n) => ({
      id: n.id,
      name: n.name,
      x: n.x,
      y: n.y,
      w: n.w ?? 1,
      h: n.h ?? 1,
      type: "npc",
      hint: n.name ? `Berbicara dengan ${n.name}` : "Ngobrol",
      ranges: ranges?.npc,
    }));
    return [...doors, ...shops, ...npcs];
  }, [ranges]);

  const getNearestInteractable = (
    player,
    interactables,
    maxDist = Infinity
  ) => {
    if (!player || !interactables?.length) return null;
    const px = (player.x ?? 0) + 0.5;
    const py = (player.y ?? 0) + 0.5;
    let best = null,
      bestD = Infinity;
    for (const it of interactables) {
      const r = { x: it.x, y: it.y, w: it.w ?? 1, h: it.h ?? 1 };
      const d = pointRectDistance(px, py, r);
      const rangesVal = it.ranges;
      const allow =
        (typeof rangesVal === "number"
          ? rangesVal
          : typeof rangesVal?.range === "number"
          ? rangesVal.range
          : undefined) ?? maxDist;
      if (d <= allow && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  };

  const activeInteractable = useMemo(() => {
    const nearest = getNearestInteractable(player, interactables, 1.6);
    return nearest ?? null;
  }, [player, interactables]);

  // === UI badge hint (pixel style) ===
  const InteractHint = ({ it, toPxX, toPxY }) => {
    if (!it) return null;
    const x = it.x + (it.w ?? 1) / 2;
    const y = it.y - 1;

    return (
      <div
        style={{
          position: "absolute",
          transform: `translate3d(${toPxX(x)}px, ${toPxY(
            y
          )}px, 0) translate(-50%, -100%)`,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        {/* inner wrapper bisa dipakai buat animasi nanti */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 8px",
            background: "#111",
            color: "#fff",
            // pakai font pixel kalau ada (opsional import di index.html), fallback monospace
            fontFamily: '"Press Start 2P","VT323",monospace',
            fontSize: 10,
            lineHeight: 1,
            letterSpacing: 0.5,
            // kotak pixel: sudut tajam + border tebal + outline kotak (double stroke)
            border: "2px solid #fff",
            boxShadow: "0 0 0 2px #000, 4px 4px 0 #000",
            borderRadius: 0,
            imageRendering: "pixelated",
          }}
        >
          {/* keycap 'E' bergaya pixel */}
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 14,
              height: 14,
              background: "#222",
              color: "#fff",
              border: "2px solid #fff",
              boxShadow: "0 0 0 2px #000, 2px 2px 0 #000",
              borderRadius: 0,
              fontSize: 9,
              lineHeight: 1,
              fontWeight: 700,
              transform: "translateZ(0)", // bantu crisp saat di-scale
            }}
          >
            E
          </span>

          <span style={{ textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {it.hint ?? "Interact"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* WORLD WRAPPER (pakai transform dari kamera follow) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "top left",
          transform: worldTransform, // << follow player (center) + hard clamp + zoom
          willChange: "transform",
        }}
      >
        {/* World layer ukuran world (unit: pixel WORLD) */}
        <div
          style={{
            position: "relative",
            width: worldW,
            height: worldH,
          }}
        >
          {/* Map di origin world (0,0). noOffset biar ga nambah offset lain */}
          <MapLayer
            location="outside"
            images={{ outside: outsideImg }}
            noOffset
            cellOverride={cell}
          />

          {/* === PLAYER (ikut kamera) === */}
          {playerPx != null && playerPy != null && (
            <div
              style={{
                position: "absolute",
                left: playerPx - visualW / 2,
                top: playerPy - visualH / 2,
                width: visualW,
                height: visualH,
                zIndex: 2,
              }}
            >
              <img
                src={spriteSrc} // kalau mau, kirim sprite dari parent
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "pixelated",
                }}
                draggable={false}
              />
            </div>
          )}

          {/* Rooftop (pakai grid system) */}
          <Abs
            x={rooftopPos.x}
            y={rooftopPos.y}
            toPxX={toPxX}
            toPxY={toPxY}
            style={{ zIndex: 3 }} // pastikan di atas map & pintu
          >
            <div
              style={{
                width: tw(9.6),
                height: th(4.8),
                backgroundImage: `url(${roofTopImg})`,
                backgroundSize: "100% 100%", // pasin ke kotak
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated", // biar crisp kalau pixel art
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </Abs>

          {/* Tree (pakai grid system) */}
          <Abs
            x={treePos.x}
            y={treePos.y}
            toPxX={toPxX}
            toPxY={toPxY}
            style={{ zIndex: 3 }} // pastikan di atas map & pintu
          >
            <div
              style={{
                width: tw(3),
                height: th(3),
                backgroundImage: `url(${treeImg})`,
                backgroundSize: "100% 100%", // pasin ke kotak
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated", // biar crisp kalau pixel art
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </Abs>

          {/* roofGrocery (pakai grid system) */}
          <Abs
            x={groPos.x}
            y={groPos.y}
            toPxX={toPxX}
            toPxY={toPxY}
            style={{ zIndex: 3 }} // pastikan di atas map & pintu
          >
            <div
              style={{
                width: tw(8.6),
                height: th(2),
                backgroundImage: `url(${roofgroImg})`,
                backgroundSize: "100% 100%", // pasin ke kotak
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated", // biar crisp kalau pixel art
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </Abs>

          {/* roofThree (pakai grid system) */}
          <Abs
            x={TroofPos.x}
            y={TroofPos.y}
            toPxX={toPxX}
            toPxY={toPxY}
            style={{ zIndex: 3 }} // pastikan di atas map & pintu
          >
            <div
              style={{
                width: tw(25.6),
                height: th(2.8),
                backgroundImage: `url(${threeRoofImg})`,
                backgroundSize: "100% 100%", // pasin ke kotak
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated", // biar crisp kalau pixel art
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </Abs>

          {/* NPCs */}
          {npcList.map((npc) => {
            const spriteKey =
              npc.spriteKey ?? (npc.id ? `warga_${npc.id}` : null);
            const src = getCitizenSprite(spriteKey);

            // ukuran dalam tile (boleh set di npcList), default 1 x 1.5 tile
            const wTiles = npc.wTiles ?? 1;
            const hTiles = npc.hTiles ?? 0.8;

            // anchor ke kaki (bottom-center) biar “berdiri” pas di grid
            const ax = (npc.x ?? 0) + (npc.anchorX ?? 0.5);
            const ay = (npc.y ?? 0) + (npc.anchorY ?? 1.0);

            return (
              <Abs
                key={npc.id ?? `${npc.x},${npc.y}`}
                x={ax}
                y={ay}
                toPxX={toPxX}
                toPxY={toPxY}
                title={npc.name ?? "Warga"}
                style={{ zIndex: 1 }}
              >
                <div
                  style={{
                    width: tw(wTiles),
                    height: th(hTiles),
                    transform: "translate(-50%, -100%)",
                    imageRendering: "pixelated",
                    pointerEvents: "none",
                  }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={npc.name ?? spriteKey}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: "scale(2.8)",
                        imageRendering: "pixelated",
                        display: "block",
                      }}
                      draggable={false}
                    />
                  ) : (
                    // fallback kalau file belum ada / salah nama
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "#607d8b",
                        border: "2px solid #263238",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>
              </Abs>
            );
          })}
          <InteractHint it={activeInteractable} toPxX={toPxX} toPxY={toPxY} />
        </div>
      </div>
    </div>
  );
}