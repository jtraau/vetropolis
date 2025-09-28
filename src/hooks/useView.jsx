// useView.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { MAPS } from "../core/entities";

// util clamp sederhana
function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

const quantize = (v, step = 0.25) => Math.round(v / step) * step;

// Compute utama — support kamera follow di outside
function compute({ location = "house", player = null, zoom = 1 }) {
  const map = MAPS[location] || MAPS.house;
  const { GRID_X, GRID_Y } = map;

  const w = typeof window !== "undefined" ? window.innerWidth : 1024;
  const h = typeof window !== "undefined" ? window.innerHeight : 768;

  const baseCell = Math.min(w / GRID_X, h / GRID_Y);
  const cell = Math.max(1, Math.ceil(baseCell));

  const worldW = GRID_X * cell;
  const worldH = GRID_Y * cell;
  const viewW = w / zoom;
  const viewH = h / zoom;

  const insetX = Math.max(0, (w - worldW * zoom) / 2);
  const insetY = Math.max(0, (h - worldH * zoom) / 2);

  // ======== MODE FOLLOW: hanya di outside ========
  if (location === "outside" && player) {
    const playerPx = (player.x + 0.5) * cell;
    const playerPy = (player.y + 0.5) * cell;

    let camX = playerPx - viewW / 2;
    let camY = playerPy - viewH / 2;

    camX = Math.round(camX * zoom) / zoom;
    camY = Math.round(camY * zoom) / zoom;

    // CLAMP ke batas world supaya kamera ga nembus
    camX = clamp(camX, 0, Math.max(0, worldW - viewW));
    camY = clamp(camY, 0, Math.max(0, worldH - viewH));

    if (worldW <= viewW) camX = 0;
    if (worldH <= viewH) camY = 0;

    return {
      scale: zoom,
      GRID_X,
      GRID_Y,
      cell,
      worldW,
      worldH,
      viewW,
      viewH,
      zoom,
      screenW: w,
      screenH: h,
      offsetX: 0,
      offsetY: 0,
      camX,
      camY,
      insetX,
      insetY,
      playerPx,
      playerPy,
      worldTransform: `translate(${insetX}px, ${insetY}px) scale(${zoom}) translate(${-camX}px, ${-camY}px)`,
    };
  }

  // ======== MODE STATIS: map selain outside (perilaku lama) ========
  // offset center world di layar (tanpa zoom & kamera)
  const offsetX = Math.round((w - worldW) / 2);
  const offsetY = Math.round((h - worldH) / 2);

  return {
    GRID_X,
    GRID_Y,
    cell,
    worldW,
    worldH,
    viewW: worldW,
    viewH: worldH,
    zoom: 1,
    screenW: w,
    screenH: h,
    offsetX,
    offsetY,
    camX: 0,
    camY: 0,
    worldTransform: `translate(${offsetX}px, ${offsetY}px)`,
    insetX: 0,
    insetY: 0,
    playerPx: null,
    playerPy: null,
  };
}

export default function useView(input = "house", maybeOpts = {}) {
  const normalized = useMemo(() => {
    let location, player, zoom;
    if (typeof input === "string") {
      location = input || "house";
      ({ player = null, zoom = 1 } = maybeOpts || {});
    } else {
      ({ location = "house", player = null, zoom = 1 } = input || {});
    }
    const qZoom = quantize(zoom, 0.25); // snap ke 0.25x
    return { location, player, zoom: qZoom };
  }, [
    typeof input === "string" ? input : input?.location,
    typeof input === "string" ? maybeOpts?.player?.x : input?.player?.x,
    typeof input === "string" ? maybeOpts?.player?.y : input?.player?.y,
    typeof input === "string" ? maybeOpts?.zoom : input?.zoom,
  ]);

  const [state, setState] = useState(() => compute(normalized));

  const rafRef = useRef(null);

  useEffect(() => {
    setState(compute(normalized));

    if (typeof window === "undefined") return; // SSR guard

    function onResize() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setState(compute(normalized));
      });
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [normalized]);

  return state;
}
