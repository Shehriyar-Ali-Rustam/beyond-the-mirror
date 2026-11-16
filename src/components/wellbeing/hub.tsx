import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { WELLBEING_TOOLS, type WellbeingSlug } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";

/** The six connected tools, each with a live line from the student's own records. */
export function WellbeingHub({ base, status, signedIn = true }: { base: string; status?: Partial<Record<WellbeingSlug, string>>; signedIn?: boolean }) {
  return (
    <section aria-labelledby="my-toolkit" className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="my-toolkit" className="font-display text-2xl text-ink">
            Your wellbeing toolkit
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Six connected tools to understand your behaviour, recognise what&apos;s difficult, organise your life, reflect, and get support when you need it.
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-3">
          <Lock className="size-3.5" /> {signedIn ? "Private by default. You can edit or delete anything." : "Saved to your private account."}
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WELLBEING_TOOLS.map((t, i) => (
          <li key={t.slug} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <Link
              href={signedIn ? `${base}/${t.slug}` : `/login?next=/student/toolkit/${t.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full opacity-15 blur-2xl transition group-hover:opacity-30" style={{ background: t.accent }} />
              <div className="relative flex items-start justify-between">
                <span className={cn("flex size-11 items-center justify-center rounded-2xl", t.tone)}>
                  <t.icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-ink-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="relative mt-4 font-display text-lg text-ink">{t.title}</h3>
              <p className="relative mt-1 flex-1 text-sm leading-relaxed text-ink-2">{t.purpose}</p>
              <p className="relative mt-4 border-t border-line pt-3 text-xs font-medium" style={{ color: t.accent }}>
                {signedIn ? status?.[t.slug] ?? "Open" : "Log in to use"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
