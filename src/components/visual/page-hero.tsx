import { cn } from "@/lib/utils";
import { FloatingShapes } from "@/components/illustrations/scenes";
import { Illustration, type IllustrationName } from "./illustration";

const WASH = {
  peach: "from-coral-soft via-sun-soft to-rose-soft",
  sun: "from-sun-soft via-coral-soft to-rose-soft",
  mint: "from-mint-soft via-sky-soft to-lilac-soft",
  sky: "from-sky-soft via-lilac-soft to-mint-soft",
  lavender: "from-lilac-soft via-rose-soft to-sky-soft",
  rose: "from-rose-soft via-coral-soft to-sun-soft",
} as const;

/** Colourful page banner with an illustration: gives every section its own identity. */
export function PageHero({
  eyebrow,
  title,
  description,
  illustration,
  tone = "mint",
  actions,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  illustration: IllustrationName;
  tone?: keyof typeof WASH;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn("relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br p-6 sm:p-8", WASH[tone])}>
      <FloatingShapes className="pointer-events-none absolute -right-10 -top-12 hidden size-72 opacity-50 md:block" />
      <div aria-hidden className="arch pointer-events-none absolute -bottom-24 right-10 hidden h-64 w-52 bg-surface/50 md:block" />
      <div className="relative grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 animate-fade-up">
          {eyebrow && <p className="mb-1.5 text-sm font-medium text-ink-2">{eyebrow}</p>}
          <h1 className="font-display text-[1.9rem] leading-tight text-ink sm:text-[2.3rem]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{description}</p>}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
          {children}
        </div>
        <Illustration name={illustration} className="hidden w-48 animate-float-slow md:block lg:w-56" />
      </div>
    </section>
  );
}
