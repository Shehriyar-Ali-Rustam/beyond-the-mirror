"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Single-series column chart: 2px gaps, 4px rounded caps, hover tooltip, table fallback. */
export function ColumnChart({ data, label }: { data: { key: string; label: string; value: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = max <= 4 ? 1 : Math.ceil(max / 4);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const total = data.reduce((a, b) => a + b.value, 0);

  return (
    <figure>
      <div className="flex gap-3">
        <div className="relative h-44 w-6 shrink-0 text-right text-[11px] tabular-nums text-ink-3" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0" style={{ bottom: `${(t / top) * 100}%`, transform: "translateY(50%)" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative h-44 flex-1">
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(t / top) * 100}%` }} aria-hidden />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.key}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${d.label}: ${d.value}`}
              >
                <div
                  className={cn("w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity", hover !== null && hover !== i && "opacity-40")}
                  style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 3 : 0 }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-md">
                    <span className="block text-ink-3">{d.label}</span>
                    <span className="font-semibold text-ink">
                      {d.value} {d.value === 1 ? "request" : "requests"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-9 mt-2 flex justify-between text-[11px] text-ink-3" aria-hidden>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <figcaption className="sr-only">
        {label}. Total {total}.
        <table>
          <tbody>
            {data.map((d) => (
              <tr key={d.key}>
                <th>{d.label}</th>
                <td>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Proportion of requests by status, in reserved status colours, always labelled. */
export function StatusBar({ segments }: { segments: { label: string; value: number; className: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  if (!total) return <p className="text-sm text-ink-2">No requests yet.</p>;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="flex items-center gap-1.5 text-xs text-ink-2">
              <span className={cn("size-2.5 rounded-sm", s.className)} aria-hidden /> {s.label}
            </span>
            <span className="mt-0.5 block text-lg font-semibold text-ink">
              {s.value} <span className="text-xs font-normal text-ink-3">{Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
