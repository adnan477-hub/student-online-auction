export const inr = (n: number | string) =>
  "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function timeLeft(end: string | Date, now: number) {
  const ms = new Date(end).getTime() - now;
  if (ms <= 0) return { ended: true, label: "Ended", urgent: false };
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  return { ended: false, label, urgent: ms < 3600_000 };
}

export const CATEGORIES = [
  "Books",
  "Electronics",
  "Gadgets",
  "Accessories",
  "Stationery",
  "Furniture",
  "Other",
] as const;

export const CONDITIONS = ["New", "Like New", "Good", "Fair"] as const;

export const fmtDate = (d: string) =>
  new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
