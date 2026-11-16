import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* Small building blocks for the Cozy Room panels. */

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">{title}</h3>
        {hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function SwatchButton({ color, label, selected, onClick }: { color: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-full border border-black/10 shadow-sm transition hover:scale-110 active:scale-95",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
      )}
      style={{ background: color }}
    >
      {selected && <Check className="size-4 text-white mix-blend-difference" aria-hidden />}
    </button>
  );
}

export function Swatches({ items, value, onPick }: { items: { id: string; name: string; color: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((s) => (
        <SwatchButton key={s.id} color={s.color} label={s.name} selected={value === s.id} onClick={() => onPick(s.id)} />
      ))}
    </div>
  );
}

export function Chips<T extends string>({ items, value, onPick }: { items: readonly { id: T; name: string }[]; value: T; onPick: (id: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onPick(o.id)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95",
            value === o.id ? "bg-primary text-primary-ink shadow-sm" : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
          )}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({ label, hint, icon, checked, onChange }: { label: string; hint?: string; icon?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-3.5 py-3 text-left transition hover:bg-surface-3"
    >
      {icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", checked ? "bg-sun-soft text-ink" : "bg-surface text-ink-3")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-line-strong")} aria-hidden>
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ items, value, onPick, label }: { items: readonly { id: T; name: string; icon?: ReactNode }[]; value: T; onPick: (id: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-2xl bg-surface-2 p-1">
      {items.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onPick(o.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium transition",
            value === o.id ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {o.icon}
          {o.name}
        </button>
      ))}
    </div>
  );
}
