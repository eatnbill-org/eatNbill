export function formatINR(amount: number | string) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(value) || value == null) return "₹0";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function minutesBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.max(0, Math.round((to - from) / 60_000));
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
