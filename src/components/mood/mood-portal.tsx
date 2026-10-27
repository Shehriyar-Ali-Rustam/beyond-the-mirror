"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, AudioLines, Check, Gamepad2, MessageSquareHeart, RefreshCw, Sparkles, Wind, X } from "lucide-react";
import { MOODS, moodById, type Mood, type MoodId } from "@/lib/moods";
import { GAMES } from "@/lib/games";
import { TOOLS } from "@/lib/toolkit";
import { voiceCategory } from "@/lib/voice-meta";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SafetyNote } from "@/components/shared/safety-note";
import { Breathing } from "@/components/toolkit/reset";
import { cn } from "@/lib/utils";
import { useMood } from "./mood-provider";

type LogEntry = { id: MoodId; at: string };

const LOG_KEY = "btm:mood-log";
// Words that mean we should show safety information straight away.
const CONCERNING = /\b(suicid\w*|kill (my ?self|me)|end (it|my life)|want to die|wanna die|self[- ]?harm|hurt(ing)? my ?self|cut(ting)? my ?self|no reason to live|better off without me)\b/i;

const randomIndex = (n: number) => Math.floor(Math.random() * n);

function readLog(): LogEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((e) => moodById(e?.id) && typeof e?.at === "string") : [];
  } catch {
    return [];
  }
}

function Portal({ mood }: { mood: Mood | null }) {
  const colors = mood ? [mood.color, mood.wash[0], mood.particle, mood.wash[2], mood.color] : ["#f5b82e", "#ef6a55", "#e86a9a", "#9b85dd", "#4b9fe1", "#34b892", "#f5b82e"];
  return (
    <div className="relative mx-auto size-56 sm:size-64" aria-hidden>
      <div className="absolute inset-0 animate-spin-slow rounded-full opacity-90 blur-[2px]" style={{ background: `conic-gradient(${colors.join(",")})` }} />
      <div className="absolute inset-5 animate-spin-slow rounded-full bg-surface/40 [animation-direction:reverse]" style={{ background: `conic-gradient(from 90deg, transparent, ${colors[1]}aa, transparent 60%)` }} />
      <div className="absolute inset-10 rounded-full bg-surface/80 shadow-inner backdrop-blur" />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span key={mood?.id ?? "none"} initial={{ scale: 0.4, opacity: 0, rotate: -90 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14 }} className="text-6xl">
          🌀
        </motion.span>
      </div>
    </div>
  );
}

export function MoodPortal({
  student,
  voicesHref,
  playBase,
  toolkitBase,
}: {
  student: boolean;
  voicesHref: string | null;
  playBase: string;
  toolkitBase: string;
}) {
  const router = useRouter();
  const { mood, setMood } = useMood();
  const [words, setWords] = useState("");
  const [reflected, setReflected] = useState<string | null>(null);
  const [message, setMessage] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
    setLog(readLog());
  }, []);

  const choose = (id: MoodId) => {
    setMood(id);
    setMessage(randomIndex(4));
    const today = new Date().toDateString();
    const next = [...readLog().filter((e) => new Date(e.at).toDateString() !== today), { id, at: new Date().toISOString() }].slice(-14);
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(next));
    } catch {}
    setLog(next);
  };

  const concerning = CONCERNING.test(words) || CONCERNING.test(reflected ?? "");
  const voice = mood ? voiceCategory(mood.voice) : null;
  const game = mood ? GAMES.find((g) => g.slug === mood.game)! : null;
  const tool = mood ? TOOLS.find((t) => t.slug === mood.tool)! : null;

  const sendToCounselor = () => {
    try {
      sessionStorage.setItem(
        "btm:draft",
        JSON.stringify({
          subject: mood ? `Feeling ${mood.feeling.split(",")[0].toLowerCase()} today` : "How I'm feeling",
          body: `${mood ? `My mood colour today is ${mood.name.toLowerCase()} (${mood.feeling.toLowerCase()}).\n\n` : ""}${reflected ?? words}`.trim(),
          category: "wellbeing",
        }),
      );
    } catch {}
    router.push("/student/messages/new");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[2rem] bg-surface/70 p-6 shadow-sm ring-1 ring-line backdrop-blur sm:p-10">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="animate-fade-up">
            <p className="text-sm font-medium text-ink-2">Colour in how you feel</p>
            <h1 className="mt-1 font-display text-[2.2rem] leading-tight text-ink sm:text-[2.8rem]">The Mood Portal 🌀</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
              Pick the colour that matches your mood right now. The whole site will change with you, and you&apos;ll get a few ideas that
              might help. There&apos;s no wrong colour, and your choice stays on this device.
            </p>
            {mood && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm">
                <span className="size-3 rounded-full" style={{ background: mood.color }} /> {mood.name}
                <button onClick={() => setMood(null)} className="ml-1 rounded-full p-0.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Turn off mood colour">
                  <X className="size-3.5" />
                </button>
              </p>
            )}
          </div>
          <Portal mood={mood} />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9" role="radiogroup" aria-label="Mood colour">
          {MOODS.map((m, i) => {
            const active = mood?.id === m.id;
            return (
              <motion.button
                key={m.id}
                role="radio"
                aria-checked={active}
                onClick={() => choose(m.id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                className={cn("group flex flex-col items-center gap-2 rounded-3xl p-2 text-center transition", active ? "bg-surface shadow-md" : "hover:bg-surface/70")}
              >
                <span
                  className="relative flex size-14 items-center justify-center rounded-full shadow-md transition-transform sm:size-16"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${m.wash[0]}, ${m.color} 60%)` }}
                >
                  {active && <Check className="size-6 text-white drop-shadow" />}
                </span>
                <span className="text-xs font-semibold leading-tight text-ink">{m.name}</span>
                <span className="hidden text-[11px] leading-tight text-ink-3 sm:block">{m.feeling}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {mood && (
          <motion.div key={mood.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 space-y-6">
            <section className="relative overflow-hidden rounded-3xl p-6 text-center shadow-sm sm:p-8" style={{ background: `linear-gradient(135deg, ${mood.wash[0]}, ${mood.wash[2]})` }}>
              <Sparkles className="mx-auto size-6" style={{ color: mood.color }} />
              <AnimatePresence mode="wait">
                <motion.p key={message} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mx-auto mt-3 max-w-2xl font-display text-2xl leading-snug text-ink sm:text-[1.7rem]">
                  {mood.messages[message % mood.messages.length]}
                </motion.p>
              </AnimatePresence>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setMessage((m) => m + 1)}>
                <RefreshCw /> Another message
              </Button>
            </section>

            <div>
              <h2 className="font-display text-xl text-ink">Things that might help right now</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {voice && voicesHref && (
                  <Link
                    href={voicesHref}
                    className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className={cn("flex size-11 items-center justify-center rounded-2xl text-xl", voice.tone)}>{voice.emoji}</span>
                    <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-lilac">
                      <AudioLines className="size-3.5" /> Voice note
                    </p>
                    <p className="mt-1 font-display text-lg text-ink">{voice.title}</p>
                    <p className="mt-1 flex-1 text-sm text-ink-2">Hear a few words from another student who&apos;s been there.</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Listen <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                )}
                {game && (
                  <Link href={`${playBase}/${game.slug}`} className={cn("group flex flex-col rounded-3xl bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md", game.gradient)}>
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-surface text-xl shadow-sm">{game.emoji}</span>
                    <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: game.accent }}>
                      <Gamepad2 className="size-3.5" /> Quick game
                    </p>
                    <p className="mt-1 font-display text-lg text-ink">{game.title}</p>
                    <p className="mt-1 flex-1 text-sm text-ink-2">{game.tagline}. A couple of minutes to reset your head.</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                      Play <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                )}
                {tool && (
                  <Link
                    href={`${toolkitBase}/${tool.slug}`}
                    className="group flex flex-col rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <span className={cn("flex size-11 items-center justify-center rounded-2xl", tool.tone)}>
                      <tool.icon className="size-5" />
                    </span>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-3">Self-help tool</p>
                    <p className="mt-1 font-display text-lg text-ink">{tool.title}</p>
                    <p className="mt-1 flex-1 text-sm text-ink-2">{tool.tagline}.</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                )}
                <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm md:col-span-2 lg:col-span-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky">
                    <Wind className="size-3.5" /> Breathe with me
                  </p>
                  <Breathing compact />
                </div>
              </div>
            </div>

            {mood.suggestCounselor && student && (
              <section className="flex flex-col gap-4 rounded-3xl border-2 border-primary/25 bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-ink">
                  <MessageSquareHeart className="size-6" />
                </span>
                <div className="flex-1">
                  <p className="font-medium text-ink">Your counselor would like to know</p>
                  <p className="mt-0.5 text-sm text-ink-2">If this feeling has been around for a while, talking about it helps. You can write anonymously if you prefer.</p>
                </div>
                <Button asChild>
                  <Link href="/student/messages/new">Message my counselor</Link>
                </Button>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <p className="font-display text-xl text-ink">Want to put it into words?</p>
          <p className="mt-1 text-sm text-ink-2">Totally optional. Describe how you feel in a few words. It&apos;s not saved or sent anywhere unless you choose to.</p>
          {reflected ? (
            <div className="mt-4 animate-fade-up">
              <blockquote className="rounded-2xl border-l-4 bg-surface-2 p-4 text-[15px] italic leading-relaxed text-ink" style={{ borderColor: mood?.color ?? "var(--primary)" }} dir="auto">
                “{reflected}”
              </blockquote>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Thank you for naming it. Putting feelings into words can make them a little smaller and easier to handle.
                {mood ? "" : " Pick a mood colour above to get some ideas that match."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {student && (
                  <Button onClick={sendToCounselor}>
                    <MessageSquareHeart /> Share with my counselor
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setReflected(null);
                    setWords("");
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (words.trim()) setReflected(words.trim());
              }}
            >
              <Textarea value={words} onChange={(e) => setWords(e.target.value)} maxLength={300} placeholder="e.g. tired but a bit hopeful, worried about Monday" className="min-h-24" dir="auto" aria-label="Describe your feelings" />
              <div className="mt-3 flex items-center gap-2">
                <Button type="submit" disabled={!words.trim()}>
                  Done
                </Button>
                <span className="text-xs text-ink-3">or just skip it, that&apos;s fine too</span>
              </div>
            </form>
          )}
          {concerning && <SafetyNote className="mt-4" />}
        </div>

        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <p className="font-display text-xl text-ink">Your colours</p>
          <p className="mt-1 text-sm text-ink-2">The last two weeks, one colour a day. Only on this device.</p>
          {log.length ? (
            <ol className="mt-4 flex flex-wrap gap-2">
              {log.map((e) => {
                const m = moodById(e.id)!;
                const d = new Date(e.at);
                return (
                  <li key={e.at} className="flex flex-col items-center gap-1" title={`${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })}: ${m.name}`}>
                    <span className="size-8 rounded-full shadow-sm ring-2 ring-surface" style={{ background: m.color }} />
                    <span className="text-[10px] text-ink-3">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-ink-3">Pick a colour above and it will show up here.</p>
          )}
        </div>
      </section>
    </div>
  );
}
