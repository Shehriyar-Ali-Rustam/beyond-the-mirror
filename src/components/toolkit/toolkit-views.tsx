import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import { TOOLS, type ToolSlug } from "@/lib/toolkit";
import { ToolRenderer } from "./tool-renderer";
import { Photo } from "@/components/visual/arch-photo";

export function ToolGrid({ base }: { base: string }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map((t, i) => (
        <li key={t.slug} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <Link
            href={`${base}/${t.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
          >
            <div className="relative h-44 overflow-hidden">
              <Photo name={t.slug} className="h-full w-full" imgClassName="transition-transform duration-700 group-hover:scale-105" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/5 to-transparent" />
              <span className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${t.tone}`}>
                <t.icon className="size-3.5" /> {t.minutes}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-ink-3">{t.tagline}</p>
                <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-1 font-display text-xl text-ink">{t.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{t.description}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ToolView({ slug, base, context }: { slug: ToolSlug; base: string; context: "public" | "student" }) {
  const tool = TOOLS.find((t) => t.slug === slug)!;
  return (
    <div className="mx-auto max-w-4xl">
      <Link href={base} className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Toolkit
      </Link>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
        <Photo name={slug} priority className="h-40 w-full shrink-0 rounded-3xl shadow-md ring-4 ring-surface sm:h-36 sm:w-52" sizes="(min-width: 640px) 208px, 100vw" />
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-ink-3">{tool.tagline}</p>
          <h1 className="font-display text-[2rem] leading-tight text-ink">{tool.title}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">{tool.description}</p>
          {slug !== "letters" && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-3">
              <ShieldCheck className="size-3.5" /> Nothing you type in this tool is saved or sent anywhere.
            </p>
          )}
        </div>
      </div>
      <ToolRenderer slug={slug} context={context} />
    </div>
  );
}
