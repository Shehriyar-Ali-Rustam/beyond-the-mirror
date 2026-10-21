/**
 * Timezone-aware formatting that renders identically on the server and in the
 * browser (we pass the viewer's IANA timezone explicitly everywhere).
 */
export const DEFAULT_TZ = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "UTC";

export function isValidTz(tz: string | undefined | null): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions) {
  const key = tz + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts });
    cache.set(key, f);
  }
  return f;
}

const toDate = (d: string | Date) => (typeof d === "string" ? new Date(d) : d);

/** "YYYY-MM-DD" in the given timezone, used for grouping by day. */
export function dayKey(d: string | Date, tz: string) {
  const parts = fmt(tz, { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(toDate(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dayDiff(d: string | Date, tz: string, now = new Date()) {
  const a = Date.parse(dayKey(d, tz));
  const b = Date.parse(dayKey(now, tz));
  return Math.round((a - b) / 86_400_000);
}

export function formatTime(d: string | Date, tz: string) {
  return fmt(tz, { hour: "2-digit", minute: "2-digit", hour12: false }).format(toDate(d));
}

export function formatDate(d: string | Date, tz: string, withYear = false) {
  return fmt(tz, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(toDate(d));
}

export function formatWeekday(d: string | Date, tz: string, style: "short" | "long" = "short") {
  return fmt(tz, { weekday: style }).format(toDate(d));
}

export function formatLongDate(d: string | Date, tz: string) {
  return fmt(tz, { weekday: "long", day: "numeric", month: "long" }).format(toDate(d));
}

export function dayLabel(d: string | Date, tz: string) {
  const diff = dayDiff(d, tz);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return formatWeekday(d, tz, "long");
  return formatLongDate(d, tz);
}

export function messageTime(d: string | Date, tz: string) {
  const diff = dayDiff(d, tz);
  if (diff === 0) return formatTime(d, tz);
  if (diff === -1) return `Yesterday, ${formatTime(d, tz)}`;
  return `${formatDate(d, tz)}, ${formatTime(d, tz)}`;
}

export function shortStamp(d: string | Date, tz: string) {
  const diff = dayDiff(d, tz);
  if (diff === 0) return formatTime(d, tz);
  if (diff === -1) return "Yesterday";
  if (diff > -7) return formatWeekday(d, tz);
  return formatDate(d, tz);
}

export function timeRange(start: string | Date, end: string | Date, tz: string) {
  return `${formatTime(start, tz)}–${formatTime(end, tz)}`;
}
