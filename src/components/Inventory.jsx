import React, { useRef, useState, useEffect, useMemo } from "react";

const SLOT_COUNT = 15;
const COLS = 5;
const ROWS = Math.ceil(SLOT_COUNT / COLS);

const Inventory = ({
  show,
  inventory = [],
  setInventory,
  selectedIndex = 0,
  setSelectedIndex,
  onToast, // callback kecil
}) => {
  const gridRef = useRef(null);
  const slotRefs = useRef(Array.from({ length: SLOT_COUNT }, () => null));

  // pastikan inventory selalu punya panjang SLOT_COUNT (di view aja, data asli tidak diubah)
  const viewItems = useMemo(() => {
    const arr = Array.from(
      { length: SLOT_COUNT },
      (_, i) => inventory[i] ?? null
    );
    return arr;
  }, [inventory]);

  // drag state & ghost
  const [drag, setDrag] = useState(null); // { index, item, x, y, offsetX, offsetY }
  const dragRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  // cleanup global listener jika komponen unmount saat drag
  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = (ev) => {
    const d = dragRef.current;
    if (!d) return;
    // throttle via rAF
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const next = { ...d, x: ev.clientX, y: ev.clientY };
      dragRef.current = next;
      setDrag(next);
    });
  };

  const onUp = async (ev) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);

    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d) return;

    const grid = gridRef.current;
    if (!grid) return;

    const r = grid.getBoundingClientRect();
    const inside =
      ev.clientX >= r.left &&
      ev.clientX <= r.right &&
      ev.clientY >= r.top &&
      ev.clientY <= r.bottom;

    if (!inside) {
      setInventory((prev) => {
        const next = [...(prev ?? [])];
        // pastikan index sumber ada
        while (next.length <= d.index) next.push(null);
        if (!next[d.index]) return next;
        next[d.index] = null;
        return next;
      });
      onToast?.(`Kamu membuang ${d.item.name}.`);
      return;
    }

    // cari slot target
    let targetIndex = null;
    for (let k = 0; k < SLOT_COUNT; k++) {
      const el = slotRefs.current[k];
      if (!el) continue;
      const rr = el.getBoundingClientRect();
      if (
        ev.clientX >= rr.left &&
        ev.clientX <= rr.right &&
        ev.clientY >= rr.top &&
        ev.clientY <= rr.bottom
      ) {
        targetIndex = k;
        break;
      }
    }
    if (targetIndex == null || targetIndex === d.index) return;

    setInventory((prev) => {
      const next = [...(prev ?? [])];
      // isi lubang sampai kedua index valid
      while (next.length <= targetIndex) next.push(null);
      while (next.length <= d.index) next.push(null);
      [next[d.index], next[targetIndex]] = [next[targetIndex], next[d.index]];
      return next;
    });
    setSelectedIndex(targetIndex);
  };

  const startDrag = (e, i) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    setSelectedIndex(i);
    const item = viewItems[i];
    if (!item) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const payload = {
      index: i,
      item,
      x: e.clientX,
      y: e.clientY,
      offsetX,
      offsetY,
    };
    setDrag(payload);
    dragRef.current = payload;

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 0,
          transform: `translateX(-50%) translateY(${show ? "0" : "100%"})`,
          transition: "transform .2s ease", // sinkron dgn quickbar
          zIndex: 20,
          width: 340,
          height: 220, // sinkron dgn quickbarBottom (230) di HUD
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          willChange: "transform",
        }}
        aria-label="Inventory Panel"
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: 18,
            marginBottom: 10,
            color: "#222",
          }}
        >
          Inventory
        </div>

        <div
          ref={gridRef}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, 48px)`,
            gridTemplateRows: `repeat(${ROWS}, 48px)`,
            gap: 8,
            touchAction: "none",
          }}
        >
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const item = viewItems[i];
            const selected = i === selectedIndex;
            const isDraggingThis = drag && drag.index === i;
            return (
              <div
                key={i}
                ref={(el) => (slotRefs.current[i] = el)}
                onPointerDown={(e) => startDrag(e, i)}
                onClick={() => setSelectedIndex(i)}
                style={{
                  width: 48,
                  height: 48,
                  background: "#f5f5f5",
                  border: `2px solid ${selected ? "#1976d2" : "#bbb"}`,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#888",
                  userSelect: "none",
                  cursor: item
                    ? isDraggingThis
                      ? "grabbing"
                      : "grab"
                    : "default",
                }}
                title={item ? item.name : "Kosong"}
                aria-label={
                  item ? `Slot ${i + 1}: ${item.name}` : `Slot ${i + 1}: kosong`
                }
              >
                {item ? (
                  <span style={{ opacity: isDraggingThis ? 0 : 1 }}>
                    {item.emoji}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag ghost */}
      {drag && (
        <div
          style={{
            position: "fixed",
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
            width: 48,
            height: 48,
            background: "#ffffff",
            border: "2px solid #bbb",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            color: "#888",
            pointerEvents: "none",
            boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
            zIndex: 9999,
          }}
          aria-hidden
        >
          <span>{drag.item.emoji}</span>
        </div>
      )}
    </>
  );
};

export default Inventory;
