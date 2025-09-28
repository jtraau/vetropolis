import { shopItems } from "./entities";

export const DONATION_TARGET = 1500;

export const cures = {
  fleas: ["Obat Kutu"],
  cold: ["Obat Flu Hewan"],
  weak: ["Vitamin Hewan"],
  cough: ["Sirup Batuk Hewan"],
  wound: ["Perban"]
};

// Aturan fee klinik (global)
export const feeRule = {
  markup: 1, // margin di atas harga obat
  consult: 20, // biaya jasa
  min: 8,
  max: 500,
};

export function priceOfItem(name) {
  const it = shopItems.find(
    (x) => x.name.toLowerCase() === String(name).toLowerCase()
  );
  return it?.price ?? 10; // fallback kalau item ga ketemu
}

export function computeFeeByMedicine(medicineName) {
  const base = priceOfItem(medicineName);
  const raw = Math.round(base * (1 + feeRule.markup)) + feeRule.consult;
  return Math.max(feeRule.min, Math.min(raw, feeRule.max));
}

export function applyExamOutcome(baseFee, { score = 0 } = {}) {
  let fee = baseFee;
  if (score >= 90) fee = Math.round(baseFee * 1.1);
  else if (score >= 60) fee = Math.round(baseFee * 1.05);
  else fee = Math.round(baseFee * 0.9);
  return Math.max(feeRule.min, Math.min(fee, feeRule.max));
}

// mapping penyakit -> kalimat keluhan
export const complaints = {
  fleas: "Dok, hewan saya garuk-garuk terus.",
  cold: "Dok, dia bersin dan ingusan.",
  weak: "Dok, akhir-akhir ini dia keliatan lemas dan kurang tenaga.",
  cough: "Dok, dia batuk-batuk sejak kemarin.",
  wound: "Dok, hewan saya jatuh dari pohon, kayaknya lecet."
};

// pool penyakit buat spawn
export const SPAWN_POOL = Object.keys(complaints);
