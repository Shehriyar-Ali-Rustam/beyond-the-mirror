import Link from "next/link";
import { ArrowLeft, ArrowRight, AudioLines, Palette, Wind } from "lucide-react";
import { GAMES, type GameSlug } from "@/lib/games";
import { getDoodleWall } from "@/lib/doodles";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/visual/page-hero";
import { Illustration } from "@/components/visual/illustration";
import { GameRenderer } from "./game-renderer";

export function PlayHub({ base, role }: { base: string; role: Role | null }) {
  const toolkit = role === "student" ? "/student/toolkit/reset" : "/toolkit/reset";
  const mood = role === "student" ? "/student/mood" : "/mood";
  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        eyebrow="Mood-boosting games 🎮"
        title="The Little Reset Zone"
        description="Five quick games for when your brain needs a break. No sign-up, no ads, no pressure. Just a few minutes of fun before you get back to it."
        illustration="gaming"
        tone="sun"
      />

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g, i) => (
          <li key={g.slug} className={cn("animate-fade-up", i === 0 && "lg:row-span-2")} style={{ animationDelay: `${i * 70}ms` }}>
            <Link
              href={`${base}/${g.slug}`}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-lg",
                g.gradient,
              )}
            >
              <span className="absolute -right-4 -top-4 text-[7rem] leading-none opacity-15 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" aria-hidden>
                {g.emoji}
              </span>
              <span className="relative flex size-14 items-center justify-center rounded-2xl bg-surface text-3xl shadow-sm transition group-hover:animate-wiggle">{g.emoji}</span>
              <p className="relative mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: g.accent }}>
                {g.tagline}
              </p>
              <h2 className="relative mt-1 font-display text-2xl text-ink">{g.title}</h2>
              <p className="relative mt-2 flex-1 text-sm leading-relaxed text-ink-2">{g.description}</p>
              {i === 0 && <Illustration name="having-fun" className="relative mx-auto mt-4 hidden w-56 lg:block" />}
              <span className="relative mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-sm">
                Play <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <p className="font-display text-xl text-ink">Need something calmer?</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href={toolkit} className="flex items-center gap-3 rounded-2xl bg-sky-soft p-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:shadow-sm">
            <Wind className="size-5 text-sky" /> One minute of slow breathing
          </Link>
          {role && (
            <Link href={`/${role}/voices`} className="flex items-center gap-3 rounded-2xl bg-lilac-soft p-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:shadow-sm">
              <AudioLines className="size-5 text-lilac" /> Listen to a voice note
            </Link>
          )}
          <Link href={mood} className="flex items-center gap-3 rounded-2xl bg-rose-soft p-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:shadow-sm">
            <Palette className="size-5 text-rose" /> Pick your mood colour
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function GameView({ slug, base, role }: { slug: GameSlug; base: string; role: Role | null }) {
  const game = GAMES.find((g) => g.slug === slug)!;
  const wall = slug === "doodle" && role ? await getDoodleWall() : null;
  return (
    <div className="mx-auto max-w-6xl">
      <Link href={base} className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Reset Zone
      </Link>
      <div className={cn("relative mb-6 flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br p-5 sm:p-6", game.gradient)}>
        <span className="flex size-14 shrink-0 animate-pop items-center justify-center rounded-2xl bg-surface text-3xl shadow-sm">{game.emoji}</span>
        <div className="min-w-0">
          <h1 className="font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]">{game.title}</h1>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{game.description}</p>
        </div>
      </div>
      <GameRenderer slug={slug} role={role} wall={wall} />
    </div>
  );
}
