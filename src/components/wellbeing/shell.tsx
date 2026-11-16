import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { WELLBEING_TOOLS, type WellbeingSlug } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";

/** Common frame so the six tools read as one toolkit, with quick links between them. */
export function WellbeingShell({
  slug,
  children,
  privacy = "Private to you. Counselors and administrators can't see this unless you choose to share it.",
  base = "/student/toolkit",
}: {
  slug: WellbeingSlug;
  children: React.ReactNode;
  privacy?: string | null;
  base?: string;
}) {
  const tool = WELLBEING_TOOLS.find((t) => t.slug === slug)!;
  return (
    <div className="mx-auto max-w-6xl">
      <Link href={base} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Toolkit
      </Link>
      <header className="relative mb-6 overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div aria-hidden className="absolute -right-10 -top-16 size-48 rounded-full opacity-20 blur-3xl" style={{ background: tool.accent }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-2xl", tool.tone)}>
            <tool.icon className="size-7" />
          </span>
          <div className="min-w-0 flex-1 animate-fade-up">
            <h1 className="font-display text-[1.8rem] leading-tight text-ink sm:text-[2.1rem]">{tool.title}</h1>
            <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-2">{tool.purpose}</p>
            {privacy && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3">
                <Lock className="size-3.5" /> {privacy}
              </p>
            )}
          </div>
        </div>
        <nav aria-label="Wellbeing toolkit" className="scrollbar-thin relative -mx-1 mt-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {WELLBEING_TOOLS.map((t) => (
            <Link
              key={t.slug}
              href={`${base}/${t.slug}`}
              aria-current={t.slug === slug ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition",
                t.slug === slug ? "border-transparent bg-ink text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
              )}
            >
              <t.icon className="size-3.5" /> {t.short}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}

export function SectionCard({ title, description, action, children, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition",
        on ? "border-primary bg-primary text-primary-ink shadow-sm" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small horizontal bar for summaries. */
export function Meter({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${label}: ${value}`}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${max ? (value / max) * 100 : 0}%`, background: color }} />
      </div>
    </div>
  );
}
