"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime";

/** Drop into any server page to re-render it when matching rows change. */
export function LiveRefresh({
  channel,
  table,
  filter,
}: {
  channel: string;
  table: "messages" | "conversations" | "notifications";
  filter?: string;
}) {
  useRealtimeRefresh(channel, { table, filter });
  return null;
}
