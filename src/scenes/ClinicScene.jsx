import React, { useEffect, useRef, useState } from "react";
import useView from "../hooks/useView";
import MapLayer from "../components/MapLayer";
import useRafLoop from "../hooks/useRafLoop";
import { canInteractRect } from "../core/math";
import {
  clinicSpawns,
  MAPS,
  clinicBookshelf,
  clinicDoor,
  clinicPC,
  GAME_CONST,
} from "../core/entities";
import {
  SPAWN_POOL,
  complaints as ComplaintText,
  cures as CureMap,
  computeFeeByMedicine,
  applyExamOutcome,
} from "../core/clinicData";

import clinicImg from "../assets/maps/pet-clinic.png";
import clinicPc from "../assets/components/pc-donation.png";

// ==== Auto-build sprite atlas per-folder pasien ====
// Struktur: /assets/patient/<ID>/(down|up|left|right)_(0|1).png
const SPRITE_ATLAS = buildSpriteAtlas();
const AVAILABLE_SPRITE_IDS = Object.keys(SPRITE_ATLAS)
  .map(Number)
  .sort((a, b) => a - b);

// (opsional) kunci sprite per-nama pasien
const PREFERRED_SPRITE_BY_NAME = {
  Rara: 1,
  Ciko: 2,
  Bimo: 3,
  Moka: 4,
};

// (opsional) scale per set (kalau tiap set beda ukuran)
const SPRITE_SCALE_BY_ID = {
  1: 3,
  2: 2.6,
  3: 2.6,
  4: 2.6,
};

function buildSpriteAtlas() {
  const modules = import.meta.glob("../assets/patient/*/*_*.png", {
    eager: true,
  });
  const atlas = {};
  for (const path in modules) {
    // contoh: ../assets/patient/3/down_1.png
    const parts = path.split("/");
    const idStr = parts[parts.length - 2]; // "3"
    const file = parts[parts.length - 1]; // "down_1.png"
    const [dir, frameStrWithExt] = file.split("_"); // "down", "1.png"
    const frame = Number(frameStrWithExt.replace(".png", "")) || 0;
    const url = modules[path]?.default || modules[path];

    if (!atlas[idStr]) {
      atlas[idStr] = { down: [], up: [], left: [], right: [] };
    }
    if (atlas[idStr][dir]) {
      atlas[idStr][dir][frame] = url;
    }
  }
  return atlas;
}

function getSpriteScale(p) {
  if (p?.spriteId != null && SPRITE_SCALE_BY_ID[p.spriteId] != null) {
    return SPRITE_SCALE_BY_ID[p.spriteId];
  }
  return 3.2;
}

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

// ======== PERSISTENT MODULE STATE (tidak reset antar-mount) ========
const _listeners = new Set();
const _state = {
  isOpen: false,
  counter: 0,
  waitingIds: [], // id di kursi menunggu
  activeId: null, // id yang di exam
  leavingIds: [], // id menuju pintu keluar
  patients: new Map(),
  isResolving: false,
  lastOutcome: null,
  nextSpawnAt: 0, // timestamp ms untuk spawn berikutnya
  spawnMinMs: 700, // jeda acak min
  spawnMaxMs: 1800, // jeda acak max
  maxSeats: clinicSpawns.queueSpots?.length || 4, // kapasitas tunggu
};

function _randSpawnDelay() {
  const { spawnMinMs, spawnMaxMs } = _state;
  return spawnMinMs + Math.random() * (spawnMaxMs - spawnMinMs);
}

function getSnapshot() {
  return {
    isOpen: _state.isOpen,
    waitingIds: [..._state.waitingIds],
    activeId: _state.activeId,
    leavingIds: [..._state.leavingIds],
    patients: _state.patients,
    lastOutcome: _state.lastOutcome,
  };
}
function notify() {
  _listeners.forEach((cb) => cb(getSnapshot()));
}
export function subscribeClinic(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
export function resetClinicEngine() {
  _state.isOpen = false;
  _state.counter = 0;
  _state.waitingIds = [];
  _state.activeId = null;
  _state.leavingIds = [];
  _state.patients.clear();
  _state.isResolving = false;
  _state.lastOutcome = null;
  notify();
}

// ===== Utils
const NAMES = ["Bimo", "Rara", "Moka", "Ciko"];
const SPECIES = ["cat", "dog", "rabbit", "hamster"];
const TILES_PER_SEC = 3.2;

function dist(a, b) {
  return Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
}
function nearTile(a, b, eps = 1.25) {
  return dist(a, b) <= eps;
}
// Player boleh interaksi dari examSpot dan 4 sisi sekelilingnya
const EXAM_INTERACT_SPOTS = [
  () => clinicSpawns.examSpot,
  () => ({ x: clinicSpawns.examSpot.x, y: clinicSpawns.examSpot.y + 1 }),
  () => ({ x: clinicSpawns.examSpot.x, y: clinicSpawns.examSpot.y - 1 }),
  () => ({ x: clinicSpawns.examSpot.x + 1, y: clinicSpawns.examSpot.y }),
  () => ({ x: clinicSpawns.examSpot.x - 1, y: clinicSpawns.examSpot.y }),
];
function playerNearExam(player) {
  if (!player) return false;
  return EXAM_INTERACT_SPOTS.some((fn) => nearTile(player, fn(), 1.25));
}

function playerNearBookshelf(player, eps = 1.25) {
  if (!player) return false;
  return nearTile(player, clinicBookshelf, eps);
}

function playerNearPC(player, eps = 1.25) {
  return canInteractRect(
    player,
    {
      x: clinicPC.x,
      y: clinicPC.y,
      w: clinicPC.w ?? 1,
      h: clinicPC.h ?? 1,
    },
    eps
  );
}

function playerNearDoor(player, eps = 1.0) {
  return canInteractRect(
    player,
    {
      x: clinicDoor.x,
      y: clinicDoor.y,
      w: clinicDoor.w ?? 1,
      h: clinicDoor.h ?? 1,
    },
    eps
  );
}

function stepTowardTile(pos, target, maxStep) {
  const dx = (target.x ?? pos.x) - (pos.x ?? 0);
  const dy = (target.y ?? pos.y) - (pos.y ?? 0);
  const d = Math.hypot(dx, dy);

  if (d === 0) {
    return { x: pos.x, y: pos.y, arrived: true };
  }
  const s = Math.min(maxStep, d);
  const nx = pos.x + (dx / d) * s;
  const ny = pos.y + (dy / d) * s;
  const arrived = s === d || Math.hypot(target.x - nx, target.y - ny) < 1e-4;
  return { x: nx, y: ny, arrived };
}

function seatTileAtIndex(i) {
  const spots = clinicSpawns.queueSpots || [];
  if (!spots.length) return clinicSpawns.patientSpawn;
  return spots[Math.min(i, spots.length - 1)];
}

function randFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function mkPatientData() {
  _state.counter += 1;
  const id = _state.counter;

  const pool =
    Array.isArray(SPAWN_POOL) && SPAWN_POOL.length
      ? SPAWN_POOL
      : Object.keys(ComplaintText);
  const complaintId = randFrom(pool);

  const name = NAMES[(_state.counter * 7) % NAMES.length];

  // pilih spriteId:
  let spriteId = PREFERRED_SPRITE_BY_NAME[name];
  if (!AVAILABLE_SPRITE_IDS.includes(spriteId)) {
    const idx = (_state.counter - 1) % (AVAILABLE_SPRITE_IDS.length || 1);
    spriteId = AVAILABLE_SPRITE_IDS[idx] || 1; // fallback 1
  }

  return {
    id,
    name,
    species: SPECIES[(_state.counter * 5) % SPECIES.length],
    complaintId,
    pos: { ...clinicSpawns.patientSpawn },
    target: { ...clinicSpawns.patientSpawn },
    state: "entering", // entering -> waiting -> toExam -> exam -> leaving
    speedTiles: TILES_PER_SEC,
    spriteId, // <— penting: set unik per pasien
  };
}

function maybeSpawnOne(now) {
  if (!_state.isOpen) return;
  // jangan melebihi kapasitas kursi + 1 (yang mungkin sedang toExam/exam)
  const occupied = _state.waitingIds.length + (_state.activeId ? 1 : 0);
  if (occupied >= _state.maxSeats) return;

  if (now >= _state.nextSpawnAt) {
    const p = mkPatientData();
    _state.patients.set(p.id, p);
    _state.waitingIds.push(p.id);
    const seat = seatTileAtIndex(_state.waitingIds.indexOf(p.id));
    p.target = { ...seat };

    // jadwalkan spawn berikutnya dengan jeda acak
    _state.nextSpawnAt = now + _randSpawnDelay();
  }
}

function callNextPatient(toast) {
  if (_state.activeId) {
    const p = _state.patients.get(_state.activeId);
    toast?.(`${p?.name || "Pasien"} masih diperiksa.`);
    return;
  }

  if (_state.waitingIds.length === 0) {
    if (!_state.isOpen) toast?.("Klinik masih tutup.");
    else toast?.("Tidak ada pasien di ruang tunggu.");
    return;
  }

  const firstId = _state.waitingIds[0];
  const first = _state.patients.get(firstId);
  if (!first) return;
  const seat0 = seatTileAtIndex(0);
  // gunakan toleransi kecil supaya benar-benar "sampai"
  const arrivedSeat0 =
    Math.hypot(first.pos.x - seat0.x, first.pos.y - seat0.y) <= 0.25;
  if (!arrivedSeat0) {
    toast?.("Tunggu pasien duduk dulu.");
    return;
  }

  const id = _state.waitingIds.shift();

  _state.waitingIds.forEach((pid, i) => {
    const pp = _state.patients.get(pid);
    if (pp) pp.target = { ...seatTileAtIndex(i) };
  });

  const p = _state.patients.get(id);
  if (!p) return;
  _state.activeId = id;
  p.state = "toExam";
  p.target = { ...clinicSpawns.examSpot };

  const keluhan = ComplaintText[p.complaintId] || "(Keluhan...)";
  toast?.(`${p.name}: ${keluhan}`);
  notify();
}

// Inventory helpers — dipass dari props biar gak out-of-scope
function takeItemFromInventoryByName(setInventory, name) {
  let taken = null;
  setInventory?.((prev) => {
    const idx = prev.findIndex(
      (it) => it && it.name?.toLowerCase() === name.toLowerCase()
    );
    if (idx === -1) return prev;
    taken = prev[idx];
    const next = [...prev];
    next[idx] = null;
    return next;
  });
  return taken;
}

function hasAnyValidCureForActivePatient(inventory) {
  const id = _state.activeId;
  if (!id) return false;
  const p = _state.patients.get(id);
  if (!p) return false;
  const validList = Array.isArray(CureMap[p.complaintId])
    ? CureMap[p.complaintId]
    : [];
  if (!validList.length) return false;
  return validList.some((nm) => hasItemByName(inventory, nm));
}

function hasItemByName(inventory, name) {
  return (
    Array.isArray(inventory) &&
    inventory.some((it) => it && it.name?.toLowerCase() === name.toLowerCase())
  );
}

function giveCure({
  inventory,
  setInventory,
  toast,
  player,
  onMoney,
  onAfterServePatient,
}) {
  const id = _state.activeId;
  if (!id) return;
  const p = _state.patients.get(id);
  if (!p) return;

  if (p.state !== "exam" || !p.atExam) {
    toast?.("Pasien belum di exam spot.");
    return;
  }
  if (!playerNearExam(player)) {
    toast?.("Maju sedikit ke meja periksa dulu.");
    return;
  }

  const validList = Array.isArray(CureMap[p.complaintId])
    ? CureMap[p.complaintId]
    : [];
  if (validList.length === 0) {
    toast?.("Belum ada obat untuk keluhan ini.");
    return;
  }

  const medicineName = validList.find((nm) => hasItemByName(inventory, nm));
  if (!medicineName) {
    toast?.("Tidak ada obat yang cocok di tas.");
    return;
  }

  const ok = takeItemFromInventoryByName(setInventory, medicineName);
  if (!ok) {
    toast?.("Gagal mengambil obat.");
    return;
  }

  const baseFee = computeFeeByMedicine(medicineName);
  const finalFee = p.examRequired
    ? applyExamOutcome(baseFee, { score: p.examScore || 0 })
    : baseFee;
  onMoney?.(finalFee);
  toast?.(
    `${p.name}: Makasih dok! Obat ${medicineName} berhasil. (+${finalFee} koin)`
  );

  try {
    onAfterServePatient?.();
  } catch {}

  p.state = "leaving";
  p.atExam = false;
  p.target = { ...clinicSpawns.patientSpawn };
  _state.leavingIds.push(id);
  _state.activeId = null;
  notify();
}

function safeGiveCure(args) {
  if (_state.isResolving) return; // lagi proses → abaikan
  _state.isResolving = true;
  try {
    giveCure(args);
  } finally {
    setTimeout(() => {
      _state.isResolving = false;
    }, 150);
  }
}

function tick(dtMs) {
  const dt = Math.min(0.05, dtMs / 1000);
  _state.patients.forEach((p) => {
    if (p.state === "exam") return; // diam di exam
    const next = stepTowardTile(p.pos, p.target, p.speedTiles * dt);
    p.pos.x = next.x;
    p.pos.y = next.y;
    if (next.arrived) {
      if (p.state === "entering" || p.state === "waiting") {
        p.state = "waiting";
      } else if (p.state === "toExam") {
        p.state = "exam";
        p.atExam = true;
        p.target = { ...p.pos };
        if (p.examRequired == null) {
          const chance = GAME_CONST.EXAM_SLIDER_CHANCE ?? 0.5;
          p.examRequired = Math.random() < chance;
          p.examDone = !p.examRequired;
          p.examScore = 0;
        }
      } else if (p.state === "leaving") {
        _state.patients.delete(p.id);
        _state.leavingIds = _state.leavingIds.filter((i) => i !== p.id);
      }
    }
  });
}

const InteractHint = ({ x, y, cell, label }) => (
  <div
    style={{
      position: "absolute",
      transform: `translate3d(${x * cell}px, ${
        y * cell
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

// ===================== Komponen Scene =====================
export default function ClinicScene({
  clinicOpen,
  onMoney,
  inventory,
  setInventory,
  toast,
  player,
  onOpenDonation,
  stamina,
  onAfterServePatient,
}) {
  const [PCPos, setPCPos] = useState({ x: 20, y: 6.7 });
  const [showTips, setShowTips] = useState(false);
  const [{ activeId, patients }, setSnap] = useState(getSnapshot());

  useEffect(() => {
    _state.isOpen = !!clinicOpen;
    if (_state.isOpen) {
      _state.nextSpawnAt = performance.now() + _randSpawnDelay();
    } else {
      _state.nextSpawnAt = 0;
    }
    notify();
  }, [clinicOpen]);

  const v = useView("clinic") ?? {};
  const { cell = 16, offsetX = 0, offsetY = 0 } = v;

  const GRID = MAPS["clinic"];
  const worldW = (GRID?.GRID_X ?? 16) * cell;
  const worldH = (GRID?.GRID_Y ?? 16) * cell;

  const toPxX = (gx) => gx * cell;
  const toPxY = (gy) => gy * cell;
  const tw = (tiles) => tiles * cell;
  const th = (tiles) => tiles * cell;

  const AbsCenter = ({ cx, cy, w, h, style = {}, children, title }) => {
    return (
      <div
        title={title}
        style={{
          position: "absolute",
          transform: `translate3d(${cx * cell}px, ${
            cy * cell
          }px, 0) translate(-50%, -50%)`,
          width: w ?? undefined,
          height: h ?? undefined,
          willChange: "transform",
          ...style,
        }}
      >
        {children}
      </div>
    );
  };

  const zoneSize = (GAME_CONST.EXAM_SLIDER_ZONE_PCT ?? 18) / 100;
  const durationMs = GAME_CONST.EXAM_SLIDER_DURATION_MS ?? 1600;
  const totalTimeMs = GAME_CONST.EXAM_SLIDER_TIME_MS ?? 5000;

  const [examUI, setExamUI] = useState(() => ({
    show: false,
    cursor: 0, // 0..1
    dir: 1, // 1 ke kanan, -1 ke kiri
    bestHit: 0, // 0..1
    triesLeft: GAME_CONST.EXAM_SLIDER_TRIES ?? 3,
    zoneStart:
      Math.random() * (1 - (GAME_CONST.EXAM_SLIDER_ZONE_PCT ?? 18) / 100),
    timeLeftMs: totalTimeMs,
    finished: false,
  }));

  const lastRef = useRef(performance.now());
  const examRef = useRef(examUI);

  useEffect(() => subscribeClinic(setSnap), []);

  useEffect(() => {
    examRef.current = examUI;
  }, [examUI]);

  const openExam = () => {
    const zStart = Math.random() * (1 - zoneSize);
    setExamUI({
      show: true,
      cursor: 0,
      dir: 1,
      bestHit: 0,
      triesLeft: GAME_CONST.EXAM_SLIDER_TRIES ?? 3,
      zoneStart: zStart,
      timeLeftMs: totalTimeMs,
      finished: false,
    });
  };

  useRafLoop((dt) => {
    const s = examRef.current;
    if (!s.show) return;
    const speed = 1 / (durationMs / 1000);
    let next = s.cursor + s.dir * speed * dt;
    let dir = s.dir;
    if (next > 1) {
      next = 1 - (next - 1);
      dir = -1;
    }
    if (next < 0) {
      next = -next;
      dir = 1;
    }
    const newTime = Math.max(0, s.timeLeftMs - dt * 1000);
    if (newTime === 0 && !s.finished) {
      setExamUI((prev) => ({ ...prev, cursor: next, dir, timeLeftMs: 0 }));
      finishExam("timeout");
      return;
    }
    if (next !== s.cursor || dir !== s.dir || newTime !== s.timeLeftMs) {
      setExamUI((prev) => ({
        ...prev,
        cursor: next,
        dir,
        timeLeftMs: newTime,
      }));
    }
  });
  const examHit = () => {
    const s = examRef.current;
    if (!s.show) return;
    const { cursor, zoneStart } = s;
    const zoneEnd = zoneStart + zoneSize;
    const center = (zoneStart + zoneEnd) / 2;
    const halfW = zoneSize / 2;
    const dist = Math.abs(cursor - center);
    const closeness = Math.max(0, 1 - dist / halfW); // 1 = perfect center
    const best = Math.max(s.bestHit, closeness);
    const tries = Math.max(0, s.triesLeft - 1);
    if (tries <= 0) {
      setExamUI((prev) => ({ ...prev, bestHit: best, triesLeft: 0 }));
      finishExam("tries"); // NEW
      return;
    }
    const zStart = Math.random() * (1 - zoneSize);
    setExamUI((prev) => ({
      ...prev,
      bestHit: best,
      triesLeft: tries,
      zoneStart: zStart,
    }));
  };

  const finishExam = (reason = "done") => {
    if (examRef.current.finished) return; // cegah double
    const s = examRef.current;
    const score = Math.round((s.bestHit || 0) * 100);

    const pid = _state.activeId;
    if (pid) {
      const p = _state.patients.get(pid);
      if (p) {
        p.examScore = score;
        p.examDone = true;
      }
    }
    setExamUI((prev) => ({
      ...prev,
      show: false,
      finished: true,
      triesLeft: 0,
      timeLeftMs: 0,
    }));

    if (reason === "timeout") {
      toast?.(`Waktu habis! Mengatur dosis selesai (skor ${score})`);
    } else {
      toast?.(`Mengatur dosis selesai (skor ${score})`);
    }
  };

  // RAF loop
  useRafLoop(() => {
    const now = performance.now();
    const dt = now - lastRef.current;
    lastRef.current = now;

    if (_state.isOpen || _state.patients.size > 0) {
      if (_state.isOpen) {
        if (_state.nextSpawnAt === 0) {
          _state.nextSpawnAt = now + _randSpawnDelay();
        }
        maybeSpawnOne(now);
      }

      tick(dt);
      notify();
    }
  });

  useEffect(() => {
    function onKey(e) {
      if (e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const k = e.key.toLowerCase();
      if (examRef.current.show) {
        if (k === " ") {
          e.preventDefault();
          e.stopPropagation();
          examHit();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (k === "q") {
        if (
          !_state.isOpen &&
          !_state.activeId &&
          _state.waitingIds.length === 0
        ) {
          toast?.("Klinik masih tutup");
          return;
        }
        callNextPatient(toast);
        return;
      }
      if (k === "e") {
        if (playerNearBookshelf(player)) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") {
            e.stopImmediatePropagation();
          }
          setShowTips(true);
          return;
        }
        if (playerNearPC(player)) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") {
            e.stopImmediatePropagation();
          }
          onOpenDonation?.();
          return;
        }
        if (playerNearDoor(player)) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (!_state.isOpen && !_state.activeId) {
          toast?.("Klinik masih tutup");
          return;
        }
        if ((stamina ?? 0) < GAME_CONST.STAMINA_DECAY_ON_SERVICE) {
          toast?.("Stamina habis. Istirahat dulu atau makan/minum.");
          return;
        }
        if (_state.activeId) {
          const p = _state.patients.get(_state.activeId);
          if (
            p?.state === "exam" &&
            p.atExam &&
            p.examRequired &&
            !p.examDone
          ) {
            const hasCure = hasAnyValidCureForActivePatient(inventory);
            if (!hasCure) {
              toast?.(
                "Tidak ada obat yang cocok di tas. Cek rak panduan obat."
              );
              return;
            }
            openExam();
            return;
          }
        }
        safeGiveCure({
          inventory,
          setInventory,
          toast,
          player,
          onMoney,
          onAfterServePatient,
        });
        return;
      }
      if (k === "escape") {
        if (showTips) {
          setShowTips(false);
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") {
            e.stopImmediatePropagation();
          }
          return;
        }
        return;
      }
    }
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [inventory, setInventory, toast, player, onMoney, showTips, stamina]);

  // ===== Render helpers
  const PatientSprite = ({ p }) => {
    const scaleCell = cell ?? 16;
    const scale = getSpriteScale(p) ?? 3.1;

    // Tentukan arah dari target relatif ke posisi sekarang.
    const dx = (p?.target?.x ?? p.pos.x) - (p?.pos?.x ?? 0);
    const dy = (p?.target?.y ?? p.pos.y) - (p?.pos?.y ?? 0);
    const dist = Math.hypot(dx, dy);

    let dir = "down"; // default saat diam
    if (dist > 0.01 && p.state !== "exam") {
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? "right" : "left";
      } else {
        dir = dy > 0 ? "down" : "up";
      }
    }

    const moving = dist > 0.01 && p.state !== "exam";
    const frame = moving ? Math.floor(performance.now() / 250) % 2 : 0;

    // Ambil set sesuai spriteId
    const set =
      SPRITE_ATLAS[String(p.spriteId)] ||
      SPRITE_ATLAS[String(AVAILABLE_SPRITE_IDS[0])] ||
      SPRITE_ATLAS["1"]; // fallback

    const frames = (set && set[dir]) || (set && set.down) || [];
    const src = frames[frame] || frames[0];

    return (
      <AbsCenter
        cx={p.pos.x}
        cy={p.pos.y}
        w={cell * scale}
        h={cell * scale}
        style={{ zIndex: 1 }}
      >
        <img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
          onError={() => console.warn("Sprite pasien gagal dimuat:", src)}
        />
      </AbsCenter>
    );
  };

  let activeHint = null;
  if (playerNearPC(player)) {
    activeHint = {
      label: "PC Donasi",
      x: clinicPC.x + (clinicPC.w ?? 1) / 2,
      y: clinicPC.y - 0.8,
    };
  } else if (playerNearBookshelf(player)) {
    activeHint = {
      label: "Panduan Obat",
      x: clinicBookshelf.x,
      y: clinicBookshelf.y - 2,
    };
  } else {
    // dekat pintu
    const px = (player?.x ?? 0) + 0.5,
      py = (player?.y ?? 0) + 0.5;
    const dRect = (r) => {
      const dx = Math.max(r.x - px, 0, px - (r.x + (r.w ?? 1)));
      const dy = Math.max(r.y - py, 0, py - (r.y + (r.h ?? 1)));
      return Math.hypot(dx, dy);
    };
    if (
      dRect({
        x: clinicDoor.x,
        y: clinicDoor.y,
        w: clinicDoor.w ?? 1,
        h: clinicDoor.h ?? 1,
      }) <= 1.0
    ) {
      activeHint = {
        label: "Keluar",
        x: clinicDoor.x,
        y: clinicDoor.y - 1.5,
      };
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map klinik */}
      <MapLayer location="clinic" images={{ clinic: clinicImg }} />

      {/* Entity layer */}
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
          width: worldW,
          height: worldH,
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {[...patients.values()].map((p) => (
          <PatientSprite key={p.id} p={p} highlight={p.id === activeId} />
        ))}
      </div>

      {/* Interact hint */}
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
          width: worldW,
          height: worldH,
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        {activeHint && (
          <InteractHint
            x={activeHint.x}
            y={activeHint.y}
            cell={cell}
            label={activeHint.label}
          />
        )}
      </div>

      {/* Modal DILUAR entity layer */}
      {showTips && (
        <div
          onClick={() => setShowTips(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(2px)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            animation: "fadeIn .12s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "84vh",
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #ececec",
              boxShadow:
                "0 12px 40px rgba(0,0,0,0.22), 0 2px 10px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              transform: "translateY(0)",
              animation: "popIn .12s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1fr 32px", // spacer • title • close
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid #f1f1f1",
              }}
            >
              {/* spacer kiri (biar title benar2 center, seukuran tombol kanan) */}
              <div />

              {/* title — center */}
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 20,
                  textAlign: "center",
                  color: "#000000ff",
                }}
              >
                Panduan Obat Klinik
              </div>

              {/* tombol close — emoji ❌ */}
              <button
                onClick={() => setShowTips(false)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: "1px solid #ffd1dc",
                  background: "#ffe6eb",
                  color: "#ff3b6b",
                  cursor: "pointer",
                  display: "flex", // center isi tombol
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1, // biar emoji nggak geser
                  fontSize: 18, // tweak kalau perlu (16–20 OK)
                  transform: "translateZ(0)",
                }}
              >
                ❌
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: 18,
                overflowY: "auto",
                overscrollBehavior: "contain",
              }}
            >
              {/* List keluhan → obat sebagai pill */}
              <div style={{ display: "grid", gap: 12 }}>
                {Object.keys(ComplaintText).map((cid) => {
                  const label = ComplaintText[cid] ?? cid;
                  const cures = Array.isArray(CureMap[cid]) ? CureMap[cid] : [];
                  return (
                    <div
                      key={cid}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                        alignItems: "start",
                        justifyContent: "center",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#111827" }}>
                        {label}
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                      >
                        {cures.length ? (
                          cures.map((name) => (
                            <span
                              key={name}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 999,
                                border: "1px solid #dbeafe",
                                background: "#eef2ff",
                                color: "#3730a3",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "#6b7280" }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* keyframes untuk animasi */}
          <style>
            {`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popIn { from { transform: translateY(6px); opacity: .98 } to { transform: translateY(0); opacity: 1 } }
      `}
          </style>
        </div>
      )}

      {/* ===== Overlay: Minigame Slider (SPACE) ===== */}
      {examUI.show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 350,
            display: "grid",
            placeItems: "center",
            background:
              "radial-gradient(60% 60% at 50% 50%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.55) 100%)",
            fontFamily: '"Press Start 2P","VT323",monospace',
            color: "#111",
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              width: "min(760px, 94vw)",
              background: "#fff",
              borderRadius: 18,
              border: "3px solid #111",
              boxShadow: "0 16px 0 #111, 0 18px 28px rgba(0,0,0,0.35)", // drop shadow tebal ala pixel
              padding: 0,
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bergaya cartridge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background:
                  "repeating-linear-gradient( 45deg, #f4f4f4 0px, #f4f4f4 6px, #fafafa 6px, #fafafa 12px )",
                borderBottom: "3px solid #111",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    border: "3px solid #111",
                    background: "#a3baffff",
                    boxShadow: "inset 0 -3px 0 #2196f3",
                  }}
                />
                <div
                  style={{ fontWeight: 900, fontSize: 18, letterSpacing: 0.5 }}
                >
                  Atur Dosis Obat
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.2,
                  textAlign: "right",
                  opacity: 0.8,
                }}
              >
                Tekan <b>SPACE</b> saat indikator berada di zona biru.
                <br />
                Waktu: <b>{Math.ceil((examUI.timeLeftMs ?? 0) / 1000)}s</b>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: 20 }}>
              {/* Track */}
              <div
                style={{
                  position: "relative",
                  height: 22,
                  background: "linear-gradient(#efefef, #f9f9f9)",
                  border: "3px solid #111",
                  borderRadius: 12,
                  overflow: "hidden",
                  willChange: "contents",
                  contain: "layout paint style",
                }}
              >
                {/* Zona biru (dengan striping halus) */}
                <div
                  style={{
                    position: "absolute",
                    left: `${(examUI.zoneStart || 0) * 100}%`,
                    width: `${(zoneSize || 0) * 100}%`,
                    top: 0,
                    bottom: 0,
                    background: "linear-gradient(#bbf7d0, #2196f3)", // gradient hijau
                    boxShadow: "inset 0 0 0 3px #111",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${(examUI.zoneStart || 0) * 100}%`,
                    width: `${(zoneSize || 0) * 100}%`,
                    top: 0,
                    bottom: 0,
                    background:
                      "repeating-linear-gradient( 135deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 6px, transparent 6px, transparent 12px )",
                    pointerEvents: "none",
                  }}
                />

                {/* Tick marks tiap 10% */}
                {Array.from({ length: 11 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${i * 10}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background:
                        i % 2 === 0 ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.08)",
                    }}
                  />
                ))}

                {/* Indikator */}
                <div
                  style={{
                    position: "absolute",
                    left: `calc(${((examUI.cursor || 0) * 100).toFixed(
                      2
                    )}% - 8px)`,
                    top: -6,
                    width: 16,
                    height: 34,
                    background: "#111",
                    border: "3px solid #fff",
                    boxShadow: "0 0 0 2px #000",
                    borderRadius: 6,
                    transition: "none", // sebelumnya "left 50ms linear"
                    willChange: "left", // hint ke browser
                    transform: "translateZ(0)", // aktifin compositor
                    backfaceVisibility: "hidden",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Info row */}
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    border: "3px solid #111",
                    borderRadius: 10,
                    background: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      background: "#a3baffff",
                      border: "3px solid #111",
                      boxShadow: "inset 0 -3px 0 #2196f3",
                    }}
                  />
                  Sisa percobaan:{" "}
                  <b style={{ marginLeft: 6 }}>{examUI.triesLeft}</b>
                </div>

                {/* NEW: Timer bar */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    Timer
                  </div>
                  <div
                    aria-label="Sisa waktu"
                    style={{
                      position: "relative",
                      height: 14,
                      flex: 1,
                      background: "#f3f4f6",
                      border: "3px solid #111",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((examUI.timeLeftMs ?? 0) / totalTimeMs) * 100
                          )
                        ).toFixed(1)}%`,
                        background: "linear-gradient(#ffedd5, #f59e0b)",
                        boxShadow: "inset 0 0 0 2px #111",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Abs
        x={PCPos.x}
        y={PCPos.y}
        toPxX={toPxX}
        toPxY={toPxY}
        style={{ zIndex: 10 }}
      >
        <div
          style={{
            width: tw(2.7),
            height: th(3),
            backgroundImage: `url(${clinicPc})`,
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
          }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
      </Abs>
    </div>
  );
}
