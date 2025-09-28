// src/components/DebugColliders.jsx
import React from "react";
import useView from "../hooks/useView";
import { COLLIDERS } from "../core/collision";

const STEP = 0.2; // granularity min untuk w/h
const HANDLE = 12; // ukuran handle (px)
const MIN_W = STEP;
const MIN_H = STEP;

export default function DebugColliders({ location = "house" }) {
  // PENTING: pass location biar offset/cell sesuai map aktif
  const {
    cell,
    GRID_X,
    GRID_Y,
    insetX,
    insetY,
    camX,
    camY,
    zoom,
    scale = 1, // alias; di outside = zoom
  } = useView(location);

  const [sel, setSel] = React.useState(0);
  const [tick, setTick] = React.useState(0);
  const [drag, setDrag] = React.useState(null); // { mode:'move'|'resize', corner:'nw'|'ne'|'sw'|'se', index, startMouse:{x,y}, startRect:{x,y,w,h} }

  const list = COLLIDERS[location] || (COLLIDERS[location] = []);
  const rerender = () => setTick((n) => n + 1);

  const toPx = (t) => t * cell;
  const toTileDelta = (px) => px / (cell * scale); // benar (scale = zoom)

  const screenRect = (c) => ({
    left: insetX + (toPx(c.x) - camX) * scale,
    top: insetY + (toPx(c.y) - camY) * scale,
    width: toPx(c.w) * scale,
    height: toPx(c.h) * scale,
  });

  const clampRect = (r) => {
    // clamp biar ga negatif & ga keluar map (kira-kira)
    const nx = Math.max(0, Math.min(GRID_X - MIN_W, r.x));
    const ny = Math.max(0, Math.min(GRID_Y - MIN_H, r.y));
    const nw = Math.max(MIN_W, Math.min(GRID_X - nx, r.w));
    const nh = Math.max(MIN_H, Math.min(GRID_Y - ny, r.h));
    return { x: round(nx), y: round(ny), w: round(nw), h: round(nh) };
  };

  const hitTestCorner = (mx, my, rect) => {
    const corners = [
      { k: "nw", x: rect.left, y: rect.top, cursor: "nwse-resize" },
      {
        k: "ne",
        x: rect.left + rect.width,
        y: rect.top,
        cursor: "nesw-resize",
      },
      {
        k: "sw",
        x: rect.left,
        y: rect.top + rect.height,
        cursor: "nesw-resize",
      },
      {
        k: "se",
        x: rect.left + rect.width,
        y: rect.top + rect.height,
        cursor: "nwse-resize",
      },
    ];
    for (const c of corners) {
      if (Math.abs(mx - c.x) <= HANDLE && Math.abs(my - c.y) <= HANDLE) {
        return c.k;
      }
    }
    return null;
  };

  const pointInRect = (mx, my, rect) =>
    mx >= rect.left &&
    mx <= rect.left + rect.width &&
    my >= rect.top &&
    my <= rect.top + rect.height;

  // Mouse handlers
  const onMouseDown = (e) => {
    // posisi mouse screen
    const mx = e.clientX;
    const my = e.clientY;

    // cari collider yang kena (prioritas yang terakhir — tampil seolah paling atas)
    let hitIndex = -1;
    let hitCorner = null;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = screenRect(list[i]);
      const corner = hitTestCorner(mx, my, r);
      if (corner) {
        hitIndex = i;
        hitCorner = corner;
        break;
      }
      if (pointInRect(mx, my, r)) {
        hitIndex = i;
        break;
      }
    }

    if (hitIndex >= 0) {
      setSel(hitIndex);
      const startRect = { ...list[hitIndex] };
      if (hitCorner) {
        setDrag({
          mode: "resize",
          corner: hitCorner,
          index: hitIndex,
          startMouse: { x: mx, y: my },
          startRect,
        });
      } else {
        setDrag({
          mode: "move",
          index: hitIndex,
          startMouse: { x: mx, y: my },
          startRect,
        });
      }
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onMouseMove = (e) => {
    if (!drag) return;
    const mx = e.clientX;
    const my = e.clientY;
    const dxTile = toTileDelta(mx - drag.startMouse.x);
    const dyTile = toTileDelta(my - drag.startMouse.y);

    const cur = { ...drag.startRect };

    if (drag.mode === "move") {
      cur.x = drag.startRect.x + dxTile;
      cur.y = drag.startRect.y + dyTile;
      list[drag.index] = clampRect(cur);
      rerender();
      return;
    }

    // resize
    switch (drag.corner) {
      case "nw": {
        const nx = drag.startRect.x + dxTile;
        const ny = drag.startRect.y + dyTile;
        const dw = drag.startRect.x - nx;
        const dh = drag.startRect.y - ny;
        cur.x = nx;
        cur.y = ny;
        cur.w = drag.startRect.w + dw;
        cur.h = drag.startRect.h + dh;
        break;
      }
      case "ne": {
        const ny = drag.startRect.y + dyTile;
        const newW = drag.startRect.w + dxTile;
        const dh = drag.startRect.y - ny;
        cur.y = ny;
        cur.w = newW;
        cur.h = drag.startRect.h + dh;
        break;
      }
      case "sw": {
        const nx = drag.startRect.x + dxTile;
        const newH = drag.startRect.h + dyTile;
        const dw = drag.startRect.x - nx;
        cur.x = nx;
        cur.w = drag.startRect.w + dw;
        cur.h = newH;
        break;
      }
      case "se": {
        cur.w = drag.startRect.w + dxTile;
        cur.h = drag.startRect.h + dyTile;
        break;
      }
      default:
        break;
    }

    list[drag.index] = clampRect(cur);
    rerender();
  };

  const onMouseUp = () => {
    if (drag) setDrag(null);
  };

  React.useEffect(() => {
    // Keyboard support lama (Q/E, WASD, R/F, T/G, N, Delete, P)
    const onKey = async (e) => {
      const cur = list[sel];
      switch (e.key) {
        case "q":
        case "Q":
          setSel((i) =>
            list.length ? (i - 1 + list.length) % list.length : 0
          );
          break;
        case "e":
        case "E":
          setSel((i) => (list.length ? (i + 1) % list.length : 0));
          break;

        case "w":
        case "W":
          if (cur) (cur.y = round(cur.y - STEP)), rerender();
          break;
        case "s":
        case "S":
          if (cur) (cur.y = round(cur.y + STEP)), rerender();
          break;
        case "a":
        case "A":
          if (cur) (cur.x = round(cur.x - STEP)), rerender();
          break;
        case "d":
        case "D":
          if (cur) (cur.x = round(cur.x + STEP)), rerender();
          break;

        case "r":
        case "R":
          if (cur) (cur.w = round(cur.w + STEP)), rerender();
          break;
        case "f":
        case "F":
          if (cur) (cur.w = round(Math.max(MIN_W, cur.w - STEP))), rerender();
          break;
        case "t":
        case "T":
          if (cur) (cur.h = round(cur.h + STEP)), rerender();
          break;
        case "g":
        case "G":
          if (cur) (cur.h = round(Math.max(MIN_H, cur.h - STEP))), rerender();
          break;

        case "n":
        case "N":
          list.push({ x: 5, y: 5, w: 2, h: 2 });
          setSel(list.length - 1);
          rerender();
          break;

        case "Delete":
          if (list.length) {
            list.splice(sel, 1);
            setSel((i) => Math.max(0, Math.min(i, list.length - 1)));
            rerender();
          }
          break;

        case "p":
        case "P": {
          const json = JSON.stringify(list, null, 2);
          console.clear();
          console.log("=== COLLIDERS.%s ===\n%s", location, json);
          try {
            await navigator.clipboard.writeText(json);
            alert("Collider JSON copied!");
          } catch {
            alert("Collider JSON logged to console.");
          }
          break;
        }

        default:
          return;
      }
      e.preventDefault();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sel,
    location,
    drag,
    cell,
    insetX,
    insetY,
    camX,
    camY,
    GRID_X,
    GRID_Y,
    scale,
  ]);
  
  // NOTE: pointerEvents harus 'auto' supaya mouse bisa klik/drag
  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "auto",
        zIndex: 5000,
      }}
    >
      {list.map((c, i) => {
        const r = screenRect(c);
        const selected = i === sel;
        return (
          <React.Fragment key={i + "-" + tick}>
            {/* body */}
            <div
              style={{
                position: "absolute",
                left: r.left,
                top: r.top,
                width: r.width,
                height: r.height,
                outline: `2px solid ${selected ? "cyan" : "red"}`,
                background: selected
                  ? "rgba(0,255,255,0.2)"
                  : "rgba(255,0,0,0.2)",
                cursor: selected ? "move" : "pointer",
              }}
              title={`#${i} (${c.x},${c.y}, ${c.w}x${c.h})`}
              onMouseDown={(e) => {
                // pilih langsung collider yg diklik
                setSel(i);
                // biar bubbling ke handler utama (onMouseDown di wrapper) untuk set drag
              }}
            />

            {/* handles (tampil saat selected) */}
            {selected &&
              ["nw", "ne", "sw", "se"].map((corner) => {
                const pos = cornerPos(corner, r);
                const cursor =
                  corner === "nw" || corner === "se"
                    ? "nwse-resize"
                    : "nesw-resize";
                return (
                  <div
                    key={corner}
                    style={{
                      position: "absolute",
                      left: pos.x - HANDLE / 2,
                      top: pos.y - HANDLE / 2,
                      width: HANDLE,
                      height: HANDLE,
                      background: "#fff",
                      border: "2px solid #000",
                      borderRadius: 2,
                      cursor,
                    }}
                    onMouseDown={(e) => {
                      // set drag resize di corner tertentu
                      setDrag({
                        mode: "resize",
                        corner,
                        index: i,
                        startMouse: { x: e.clientX, y: e.clientY },
                        startRect: { ...c },
                      });
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    title={`${corner.toUpperCase()} handle`}
                  />
                );
              })}
          </React.Fragment>
        );
      })}

      {/* legend */}
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          color: "#fff",
          fontSize: 12,
          background: "rgba(0,0,0,0.6)",
          padding: 6,
          borderRadius: 6,
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        <b>Collider Editor (mouse)</b>
        <br />
        Drag body: move
        <br />
        Drag corners: resize
        <br />
        <b>Keyboard</b>: Q/E pilih • WASD geser • R/F lebar ± • T/G tinggi ± • N
        tambah • Del hapus • P export • L koordinat posisi
      </div>
    </div>
  );
}

function cornerPos(corner, r) {
  switch (corner) {
    case "nw":
      return { x: r.left, y: r.top };
    case "ne":
      return { x: r.left + r.width, y: r.top };
    case "sw":
      return { x: r.left, y: r.top + r.height };
    case "se":
      return { x: r.left + r.width, y: r.top + r.height };
    default:
      return { x: r.left, y: r.top };
  }
}

function round(v) {
  return Math.round(v * 100) / 100;
}
