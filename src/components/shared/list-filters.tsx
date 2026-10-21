"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** URL-driven tabs + search so filtered views are linkable and server-rendered. */
export function ListFilters({
  tabs,
  param = "status",
  searchPlaceholder = "Search…",
  extra,
}: {
  tabs: { value: string; label: string; count?: number }[];
  param?: string;
  searchPlaceholder?: string;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const current = params.get(param) ?? tabs[0]?.value ?? "";
  const [q, setQ] = useState(params.get("q") ?? "");

  const push = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) push({ q: q.trim() || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", pending && "opacity-80")}>
      <div role="tablist" className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
        {tabs.map((t) => {
          const active = current === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => push({ [param]: t.value === tabs[0].value ? null : t.value })}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={cn("text-xs", active ? "opacity-70" : "text-ink-3")}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-line-strong bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 hover:text-ink"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
