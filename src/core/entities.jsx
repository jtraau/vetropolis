export const MAPS = {
  house: { GRID_X: 25, GRID_Y: 24 },
  outside: { GRID_X: 56, GRID_Y: 32 },
  clinic: { GRID_X: 25, GRID_Y: 24 },
};

export const initialPlayer = { x: 7, y: 8 };

export const GAME_CONST = {
  RADIUS: { shop: 1.5, npc: 1.5, door: 1.0 },
  STRIDE_TILES_PER_STEP: 1.3,
  HP_DECAY_PER_SEC: 5.0,
  HP_REGEN_PER_SEC: 2.0,
  FADE_OUT_MS: 420,
  FADE_IN_DELAY_MS: 60,
  INPUT_RESTORE_MS: 100,
  CONSUME_COOLDOWN_MS: 250,
  STAMINA_DECAY_ON_SERVICE: 10,
  SLEEP_COOLDOWN_MS: 3 * 60 * 1000,
  EXAM_SLIDER_CHANCE: 0.5,
  EXAM_SLIDER_TRIES: 3,
  EXAM_SLIDER_ZONE_PCT: 15,
  EXAM_SLIDER_DURATION_MS: 1600,
  EXAM_SLIDER_TIME_MS: 10000,
};

import slide1 from "../assets/cutscene/slide1.jpg";
import slide2 from "../assets/cutscene/slide2.jpg";
import slide3 from "../assets/cutscene/slide3.jpg";
import slide4 from "../assets/cutscene/slide4.jpg";

import ending1 from "../assets/cutscene/ending1.jpg";
import ending2 from "../assets/cutscene/ending2.jpg";

export const DIALOGUE = {
  opening: [
    {
      name: "Narator",
      text: "Ventra, seorang dokter hewan, kembali ke desa tempat ia tumbuh. Ia berniat membangkitkan lagi klinik peninggalan ayahnya tempat penuh cerita masa kecil.",
      img: slide1,
    },
    {
      name: "Narator",
      text: "Kini ia berdiri di depan klinik yang sepi. Dulu tempat ini ramai, penuh suara hewan dan tawa pemiliknya. Meski kondisinya suram, ia yakin bisa menghidupkannya kembali.",
      img: slide2,
    },
    {
      name: "Narator",
      text: "Debu dan sunyi menyelimuti ruangan, setiap sudut mengingatkannya pada ayahnya. Cinta sang ayah terhadap hewan menjadi api yang menyalakan semangat Ventra untuk membangkitkan klinik ini.",
      img: slide3,
    },
    {
      name: "Narator",
      text: "Di kamar peninggalan orang tuanya, Ventra bertekad. Klinik warisan orang tua ini harus kembali hidup. Ia akan merawat setiap hewan, mengumpulkan koin demi donasi, agar klinik ini kembali diakui dan menjadi harapan baru bagi desa.",
      img: slide4,
    },
  ],
  ending: [
    {
      name: "Narator",
      text: "Akhirnya, donasi berhasil terkumpul. Vetropolis kembali hidup, hewan-hewan mendapatkan pengobatan, dan warga desa kembali percaya akan harapan baru.",
      img: ending1,
    },
    {
      name: "Pak Rudi",
      text: '"Terima kasih, Ventra. Usaha dan kebaikanmu takkan kami lupakan. Mulai hari ini, Vetropolis adalah rumah untuk setiap hewan yang butuh pertolongan."',
      img: ending2,
    },
    {
      name: "Narator",
      text: "Perjalananmu di Vetropolis belum berakhir. Masih banyak hewan yang butuh uluran tangan, masih banyak cerita yang menanti. Namun untuk hari ini, kau telah menyalakan kembali semangat desa dan memberi harapan baru bagi semua. Terima kasih sudah bermain dan menjadi bagian dari kisah ini.",
      center: true,
    },
  ],
  npc: {
    1: [
      { name: "Pak Rudi", text: "Halo, Ventra. Sudah lama tidak bertemu." },
      {
        name: "Pak Rudi",
        text: "Banyak hewan sakit butuh pengobatan, klinik warisan ayah kamu bisa membantu.",
      },
      {
        name: "Pak Rudi",
        text: "Halo, Ventra. Mau ngobrol sesuatu?",
      },
      {
        choice: true,
        options: [
          { text: "Setor donasi", action: "donate" },
          { text: "Tidak ada", action: "smalltalk" },
        ],
      },
      {
        name: "Pak Rudi",
        text: "Saya selalu disini. Semoga kliniknya makin ramai ya.",
      },
    ],
    2: [
      { name: "Bu Siti", text: "Cuaca hari ini cerah ya" },
      { name: "Bu Siti", text: "Semoga dagangan laris manis." },
    ],
  },
};

export const getNpcDialogue = (id) => {
  return DIALOGUE.npc[id] ?? [];
};

export const npcList = [
  { id: 1, name: "Pak Rudi", x: 29, y: 11 },
  { id: 2, name: "Bu Siti", x: 36, y: 23.5 },
];

export const door = { x: 20, y: 23 };
export const doorOutside = { x: 38, y: 8.3 };
export const clinicDoor = { x: 12.5, y: 22 };
export const clinicDoorOutside = { x: 17.6, y: 22.3 };

export const clinicBookshelf = { x: 4, y: 12 };
export const clinicPC = { x: 12, y: 8 };

export const bed = { x: 1, y: 7 };

export const clinicLayout = {
  waitingBench: { x: 2, y: 18 }, // <<— SESUAIKAN dgn posisi bangku di map lo
  queueDir: "horizontal", // "horizontal" sejajar bangku, "vertical" kalau mau ke bawah
  queueCount: 4,
  queueGap: 2, // jarak antar pasien (dalam tile)
};

const makeQueue = (start, dir, count, gap) =>
  Array.from({ length: count }, (_, i) =>
    dir === "horizontal"
      ? { x: start.x + i * gap, y: start.y }
      : { x: start.x, y: start.y + i * gap }
  );

export const clinicSpawns = {
  patientSpawn: { x: clinicDoor.x, y: clinicDoor.y - 1 },
  examSpot: { x: 18, y: 14 },
  queueSpots: makeQueue(
    clinicLayout.waitingBench,
    clinicLayout.queueDir,
    clinicLayout.queueCount,
    clinicLayout.queueGap
  ),
};

export const shopItems = [
  {
    id: 1,
    name: "Roti",
    emoji: "🍞",
    price: 18,
    restoreHunger: 15,
    restoreThirst: 0,
    restoreStamina: 15,
  },
  {
    id: 2,
    name: "Daging",
    emoji: "🍗",
    price: 25,
    restoreHunger: 23,
    restoreThirst: 0,
    restoreStamina: 23,
  },
  {
    id: 3,
    name: "Pisang",
    emoji: "🍌",
    price: 15,
    restoreHunger: 12,
    restoreThirst: 0,
    restoreStamina: 12,
  },
  {
    id: 4,
    name: "Air Mineral",
    emoji: "💧",
    price: 10,
    restoreHunger: 0,
    restoreThirst: 10,
    restoreStamina: 5,
  },
  {
    id: 5,
    name: "Susu",
    emoji: "🥛",
    price: 15,
    restoreHunger: 0,
    restoreThirst: 15,
    restoreStamina: 10,
  },
  {
    id: 6,
    name: "Teh",
    emoji: "🍵",
    price: 12,
    restoreHunger: 0,
    restoreThirst: 12,
    restoreStamina: 7,
  },
  {
    id: 7,
    name: "Obat Kutu",
    emoji: "🧴",
    price: 35,
    restoreHunger: 0,
    restoreThirst: 0,
  },
  {
    id: 8,
    name: "Vitamin Hewan",
    emoji: "💊",
    price: 45,
    restoreHunger: 0,
    restoreThirst: 0,
  },
  {
    id: 9,
    name: "Sirup Batuk Hewan",
    emoji: "🧪",
    price: 38,
    restoreHunger: 0,
    restoreThirst: 0,
  },
  {
    id: 10,
    name: "Obat Flu Hewan",
    emoji: "⚪",
    price: 42,
    restoreHunger: 0,
    restoreThirst: 0,
  },
  {
    id: 11,
    name: "Perban",
    emoji: "🩹",
    price: 40,
    restoreHunger: 0,
    restoreThirst: 0,
  },
];

// ====== kategori simple
const MEDICINE_NAMES = new Set([
  "Obat Kutu",
  "Vitamin Hewan",
  "Sirup Batuk Hewan",
  "Obat Flu Hewan",
  "Perban",
]);

export const shopFoodItems = shopItems.filter(
  (it) => !MEDICINE_NAMES.has(it.name)
);
export const shopMedItems = shopItems.filter((it) =>
  MEDICINE_NAMES.has(it.name)
);

// ====== posisi 2 toko (DALAM TILE) — sesuaikan koordinat map lo
// Saran: copy posisi 'shop' lama jadi Warung, dan bikin Apotek dekat klinik.
export const shopFood = {
  id: "food",
  label: "Warung Makan",
  x: 12.3,
  y: 22,
};

export const shopMed = {
  id: "med",
  label: "Apotek Hewan",
  x: 7.3,
  y: 9.8,
};

// Teleport area untuk OUTSIDE (grid unit)
export const outsideTeleports = [
  // Bagian kanan
  { id: "tp-C", x: 55, y: 11.4, w: 0.3, h: 7, tx: 53, ty: 25 },
  { id: "tp-B", x: 55, y: 23, w: 0.3, h: 4, tx: 53, ty: 13 },

  // Bagian kiri
  { id: "tp-A", x: 0, y: 11.4, w: 0.3, h: 7, tx: 2, ty: 25 },
  { id: "tp-D", x: 0, y: 23, w: 0.3, h: 4, tx: 2, ty: 13 },
];
