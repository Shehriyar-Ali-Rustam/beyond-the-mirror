"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setPresence } from "@/actions/profile";
import { PRESENCE } from "@/lib/constants";
import type { Presence } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PresenceSwitcher({ value }: { value: Presence }) {
  const [optimistic, setOptimistic] = useOptimistic(value);
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label="Your availability" className="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-sm">
      {(Object.keys(PRESENCE) as Presence[]).map((p) => (
        <button
          key={p}
          role="radio"
          aria-checked={optimistic === p}
          onClick={() =>
            start(async () => {
              setOptimistic(p);
              const res = await setPresence(p);
              if (!res.ok) toast.error(res.error);
            })
          }
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition",
            optimistic === p ? "bg-surface-2 font-medium text-ink" : "text-ink-3 hover:text-ink",
          )}
        >
          <span className={cn("size-2 rounded-full", PRESENCE[p].dot)} />
          {PRESENCE[p].label}
        </button>
      ))}
    </div>
  );
}
