import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isThisYear } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function relativeTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 45_000) return "just now";
  if (diff < 7 * 24 * 3600_000) return `${formatDistanceToNowStrict(d)} ago`;
  return format(d, isThisYear(d) ? "d MMM" : "d MMM yyyy");
}

export function minutesLabel(mins: number | null | undefined) {
  if (mins == null) return "-";
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = mins / 60;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)}h`;
  return `${Math.round(h / 24)}d`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Normalises Supabase/Postgres errors into something safe to show users. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return "Something went wrong. Please try again.";
  if (error.code === "P0001" || error.code === "P0002") return error.message ?? "Request failed.";
  if (error.code === "42501") return "You don't have permission to do that.";
  if (error.code === "23514") return "Some of the details are not valid.";
  return "Something went wrong. Please try again.";
}
