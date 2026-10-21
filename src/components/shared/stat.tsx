import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "neutral" | "clay" | "danger" | "ok" | "primary";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-ink-2",
    clay: "bg-clay-soft text-clay",
    danger: "bg-danger-soft text-danger",
    ok: "bg-ok-soft text-ok",
    primary: "bg-primary-soft text-primary-soft-ink",
  };
  return (
    <div className={cn("rounded-3xl border border-line bg-surface p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">{label}</p>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-xl [&_svg]:size-4", tones[tone])}>{icon}</span>}
      </div>
      <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

/** Minimal, accessible horizontal bar list (labels + values always visible). */
export function BarList({ items, max }: { items: { label: string; value: number; icon?: React.ReactNode }[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-2 [&_svg]:size-3.5 [&_svg]:text-ink-3">
              {i.icon}
              {i.label}
            </span>
            <span className="font-medium tabular-nums text-ink">{i.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${(i.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
