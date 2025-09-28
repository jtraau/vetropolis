import React, { useEffect } from "react";
import MapLayer from "../components/MapLayer";
import useView from "../hooks/useView";
import { door, bed } from "../core/entities";
import { canInteractRect } from "../core/math";
import houseImg from "../assets/maps/house-room.png";

const InteractHint = ({ gx, gy, cell, offsetX, offsetY, label = "Keluar" }) => (
  <div
    style={{
      position: "absolute",
      transform: `translate3d(${offsetX + gx * cell}px, ${
        offsetY + gy * cell
      }px, 0) translate(-50%, -100%)`,
      pointerEvents: "none",
      zIndex: 9999,
    }}
  >
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        background: "#111",
        color: "#fff",
        fontFamily: '"Press Start 2P","VT323",monospace',
        fontSize: 10,
        border: "2px solid #fff",
        boxShadow: "0 0 0 2px #000, 4px 4px 0 #000",
      }}
    >
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
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        E
      </span>
      <span style={{ textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  </div>
);

const HouseScene = ({ player, ranges, onSleep, sleepCooldownSecLeft = 0 }) => {
  const view = useView("house");
  const cell = view?.cell ?? 16;
  const offsetX = view?.offsetX ?? 0;
  const offsetY = view?.offsetY ?? 0;

  const doorRange =
    typeof ranges?.door === "number"
      ? ranges.door
      : typeof ranges?.door?.range === "number"
      ? ranges.door.range
      : 1.0;

  const canInteractDoor =
    !!player &&
    canInteractRect(
      player,
      { x: door.x, y: door.y, w: door.w ?? 1, h: door.h ?? 1 },
      doorRange
    );

  const canInteractBed =
    !!player &&
    canInteractRect(
      player,
      { x: bed.x, y: bed.y, w: bed.w ?? 6, h: bed.h ?? 3 },
      doorRange
    );

  useEffect(() => {
    function onKey(e) {
      const k = e.key?.toLowerCase?.();
      if (k !== "e") return;
      if (!canInteractBed) return;
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") {
        e.stopImmediatePropagation();
      }
      onSleep?.();
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [canInteractBed, onSleep]);

  return (
    <>
      <MapLayer location="house" images={{ house: houseImg }} />
      {/* hint di entity layer (pakai offset view) */}
      {canInteractDoor && (
        <InteractHint
          gx={door.x + (door.w ?? 1) / 2}
          gy={door.y - 0.8}
          cell={cell}
          offsetX={offsetX}
          offsetY={offsetY}
          label="Keluar"
        />
      )}
      {canInteractBed && (
        <InteractHint
          gx={bed.x + (bed.w ?? 4.7) / 2}
          gy={bed.y - 0.8}
          cell={cell}
          offsetX={offsetX}
          offsetY={offsetY}
          label={
            sleepCooldownSecLeft > 0
              ? `Tidur siap ${sleepCooldownSecLeft}s`
              : "Tidur"
          }
        />
      )}
    </>
  );
};

export default HouseScene;
