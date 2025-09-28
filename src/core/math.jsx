// src/core/math.jsx
// Kumpulan util math kecil biar ga nyampur di Gameplay.jsx

/** clamp umum */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** clamp 0..100 (buat bar/status) */
export const clamp01 = (v) => clamp(v, 0, 100);

/** bandingin angka dengan toleransi */
export const near = (a, b, eps = 1) => Math.abs(a - b) < eps;

/** bandingin posisi {x,y} dengan toleransi */
export const nearP = (p, q, eps = 1) =>
  near(p.x, q.x, eps) && near(p.y, q.y, eps);

/**
 * Gerak linier ke suatu target pake kecepatan (tiles/detik).
 * Aman dari NaN/Infinity & “teleport” kalau jarak sangat kecil.
 */
export function stepToward(pos, target, speed, dt) {
  const dx = (target?.x ?? 0) - (pos?.x ?? 0);
  const dy = (target?.y ?? 0) - (pos?.y ?? 0);
  const dist = Math.hypot(dx, dy);

  if (!Number.isFinite(dist) || dist < 0.05) {
    return {
      x: target?.x ?? pos?.x ?? 0,
      y: target?.y ?? pos?.y ?? 0,
      arrived: true,
    };
  }
  const vx = (dx / dist) * speed * dt;
  const vy = (dy / dist) * speed * dt;
  return { x: (pos?.x ?? 0) + vx, y: (pos?.y ?? 0) + vy, arrived: false };
}

// core/math.jsx (tambahkan)
export const pointRectDistance = (px, py, r) => {
  const dx = Math.max(r.x - px, 0, px - (r.x + (r.w ?? 1)));
  const dy = Math.max(r.y - py, 0, py - (r.y + (r.h ?? 1)));
  return Math.hypot(dx, dy);
};

// pusat player (x+0.5, y+0.5) lalu cek jarak ke rect
export const canInteractRect = (player, rect, maxDist = 1.0) => {
  if (!player) return false;
  const px = (player.x ?? 0) + 0.5;
  const py = (player.y ?? 0) + 0.5;
  return pointRectDistance(px, py, rect) <= maxDist;
};
