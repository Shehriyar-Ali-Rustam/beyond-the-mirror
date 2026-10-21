import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import { TOOLS, type ToolSlug } from "@/lib/toolkit";
import { ToolRenderer } from "./tool-renderer";
import { ToolArt } from "@/components/illustrations/tool-art";

export function ToolGrid({ base }: { base: string }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {TOOLS.map((t, i) => (
        <li key={t.slug} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
          <Link
            href={`${base}/${t.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
          >
            <ToolArt slug={t.slug} className="h-36 transition-transform duration-500 group-hover:scale-[1.03]" />
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-ink-3">{t.tagline}</p>
                <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-1 font-display text-xl text-ink">{t.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-2">{t.description}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-3">
                <Clock className="size-3.5" /> {t.minutes}
              </p>
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
        <ToolArt slug={slug} className="h-28 w-full shrink-0 rounded-3xl sm:h-32 sm:w-44" />
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
