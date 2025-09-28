const PLAYER_RADIUS = 0.35; // lingkaran pemain dalam satuan grid
const DEFAULT_SPEED = 6.0; // grid unit / detik
// ===== Collider per map (grid) =====
export const COLLIDERS = {
  house: [
    {
      x: 1.1,
      y: 4.4,
      w: 5.2,
      h: 5.6,
    },
    {
      x: 5.8,
      y: 4.5,
      w: 3.2,
      h: 1.8,
    },
    {
      x: 0,
      y: 13.2,
      w: 4,
      h: 4.8,
    },
    {
      x: 8.2,
      y: 12.2,
      w: 2.7,
      h: 7.6,
    },
    {
      x: 9,
      y: 8.2,
      w: 2.6,
      h: 2,
    },
    {
      x: 11.8,
      y: 9.2,
      w: 4,
      h: 1,
    },
    {
      x: 16.8,
      y: 4.4,
      w: 7.6,
      h: 3.2,
    },
    {
      x: 21.6,
      y: 11.6,
      w: 3.6,
      h: 6.3,
    },
    {
      x: 6,
      y: 14.6,
      w: 7.4,
      h: 4.2,
    },
    {
      x: -0.4,
      y: 3.4,
      w: 2,
      h: 2,
    },
    {
      x: 9.2,
      y: 3.4,
      w: 7.4,
      h: 2.4,
    },
    {
      x: 9,
      y: 5.8,
      w: 0.2,
      h: 3.4,
    },
    {
      x: 23.2,
      y: 3.2,
      w: 2,
      h: 2,
    },
    {
      x: 0,
      y: 19,
      w: 3.2,
      h: 3,
    },
    {
      x: -0.2,
      y: 19.8,
      w: 7.6,
      h: 4,
    },
    {
      x: 16.6,
      y: 12.6,
      w: 2.8,
      h: 4.2,
    },
    {
      x: 0,
      y: 0,
      w: 0.2,
      h: 23.8,
    },
    {
      x: -0.2,
      y: 22.6,
      w: 25.2,
      h: 0.2,
    },
  ],
  outside: [
    {
      x: 0,
      y: 6,
      w: 9,
      h: 4.16,
    },
    {
      x: 0,
      y: 6,
      w: 55,
      h: 2.6,
    },
    {
      x: 0,
      y: 15.3,
      w: 55,
      h: 7.5,
    },
    {
      x: 0,
      y: 27.3,
      w: 55,
      h: 1,
    },
  ],
  clinic: [
    {
      x: 1.68,
      y: 5.06,
      w: 4.99,
      h: 6.29,
    },
    {
      x: 0,
      y: 0,
      w: 25,
      h: 4.21,
    },
    {
      x: 0,
      y: 0,
      w: 1.26,
      h: 24,
    },
    {
      x: 23.68,
      y: 0,
      w: 1.32,
      h: 24,
    },
    {
      x: 2.06,
      y: 14.39,
      w: 5.37,
      h: 2.55,
    },
    {
      x: 0.97,
      y: 18.26,
      w: 8,
      h: 5.74,
    },
    {
      x: 0,
      y: 22.08,
      w: 25,
      h: 1.92,
    },
    {
      x: 14.41,
      y: 18.68,
      w: 9.65,
      h: 5.32,
    },
    {
      x: 21.52,
      y: 13.61,
      w: 2.55,
      h: 3.94,
    },
    {
      x: 15.32,
      y: 3.52,
      w: 4.18,
      h: 4.3,
    },
    {
      x: 9.74,
      y: 7.39,
      w: 5.32,
      h: 2.99,
    },
    {
      x: 21.45,
      y: 3.97,
      w: 2.55,
      h: 3.17,
    },
  ],
};

// ===== Util intersect (circle vs rect) =====
function circleIntersectsRect(cx, cy, cr, rx, ry, rw, rh) {
  // clamp titik circle ke dalam rect
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function blockedAt(x, y, location, r = PLAYER_RADIUS) {
  const list = COLLIDERS[location] || [];
  for (const c of list) {
    if (circleIntersectsRect(x, y, r, c.x, c.y, c.w, c.h)) return true;
  }
  return false;
}

// ===== Resolver gerak (separate axis) =====
export function resolveMovement(
  pos, // {x, y}
  moving, // {w,a,s,d} true/false
  delta, // detik
  location, // "house"
  speed = DEFAULT_SPEED
) {
  let dx = 0,
    dy = 0;
  if (moving.w) dy -= speed * delta;
  if (moving.s) dy += speed * delta;
  if (moving.a) dx -= speed * delta;
  if (moving.d) dx += speed * delta;

  // kalau ga gerak
  if (dx === 0 && dy === 0) return pos;

  let nx = pos.x,
    ny = pos.y;

  // langkah X
  const tryX = nx + dx;
  if (!blockedAt(tryX, ny, location)) {
    nx = tryX;
  } else {
    // “slide” sepanjang tepi: coba setengah langkah (reduce jitter)
    const slideX = nx + Math.sign(dx) * Math.max(0.0, Math.abs(dx) - 0.02);
    if (!blockedAt(slideX, ny, location)) nx = slideX;
  }

  // langkah Y
  const tryY = ny + dy;
  if (!blockedAt(nx, tryY, location)) {
    ny = tryY;
  } else {
    const slideY = ny + Math.sign(dy) * Math.max(0.0, Math.abs(dy) - 0.02);
    if (!blockedAt(nx, slideY, location)) ny = slideY;
  }

  return { x: nx, y: ny };
}
