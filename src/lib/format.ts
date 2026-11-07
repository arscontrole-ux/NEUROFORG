export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function fmtBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes <= 0) return "0 o";
  const units = ["o", "Ko", "Mo", "Go", "To"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: digits })} ${units[i]}`;
}

export function fmtSpeed(bps: number): string {
  return `${fmtBytes(bps)}/s`;
}

export function fmtDuration(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  if (sec < 60) return `${Math.ceil(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${(m % 60).toString().padStart(2, "0")} min`;
}

export function fmtPct(v: number): string {
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "à l'instant";
  if (d < 3_600_000) return `il y a ${Math.floor(d / 60_000)} min`;
  if (d < 86_400_000) return `il y a ${Math.floor(d / 3_600_000)} h`;
  return `il y a ${Math.floor(d / 86_400_000)} j`;
}

export function randomHex(len: number): string {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function splitIntoSegments(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const sizes = new Array(n).fill(base) as number[];
  sizes[n - 1] += total - base * n;
  return sizes;
}
