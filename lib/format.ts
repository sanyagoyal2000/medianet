export function relTime(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}

export const relShort = (iso: string | null | undefined) =>
  relTime(iso).replace(" hours ago", "h ago").replace(" hour ago", "h ago").replace(" min ago", "m ago");

/** HH:MM:SS(.mmm) in UTC */
export function clock(iso: string, ms = false) {
  return new Date(iso).toISOString().slice(11, ms ? 23 : 19);
}

export function dateTime(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${day}, ${d.toISOString().slice(11, 19)}`;
}

export const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;
export const int = (n: number) => n.toLocaleString("en-US");
export const usd = (n: number) =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
