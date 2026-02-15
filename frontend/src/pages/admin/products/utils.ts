import { clamp } from "@/lib/format";

export function calcDiscountedPrice(price: number, percent: number) {
  const p = clamp(percent, 0, 100);
  const next = price * (1 - p / 100);
  return Math.round(next * 100) / 100;
}

export function toTimeHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
