"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Table = "messages" | "conversations" | "notifications";

/**
 * Subscribes to Postgres changes. RLS applies to realtime, so a client only
 * ever receives rows it is allowed to read.
 */
export function useRealtime<T extends Record<string, unknown>>(
  channel: string,
  opts: { table: Table; event?: "INSERT" | "UPDATE" | "*"; filter?: string; enabled?: boolean },
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void,
) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  const { table, event = "*", filter, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | undefined;

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      ch = supabase
        .channel(channel)
        .on(
          "postgres_changes" as never,
          { event, schema: "public", table, ...(filter ? { filter } : {}) },
          (payload: RealtimePostgresChangesPayload<T>) => handler.current(payload),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [channel, table, event, filter, enabled]);
}

/** Re-renders server components (debounced) when matching rows change. */
export function useRealtimeRefresh(
  channel: string,
  opts: { table: Table; event?: "INSERT" | "UPDATE" | "*"; filter?: string; enabled?: boolean },
  delay = 400,
) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useRealtime(channel, opts, () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), delay);
  });
}
