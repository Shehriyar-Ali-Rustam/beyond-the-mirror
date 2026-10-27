"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BedDouble, Brain, CalendarRange, Focus, HeartHandshake, Info, Layers, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Breathing } from "./reset";
import { toolHref, useSendToCounselor, useToolContext } from "./shared";

type Area = "exams" | "overthinking" | "focus" | "sleep" | "overwhelm";

const QUESTIONS: { area: Area; text: string }[] = [
  { area: "exams", text: "I feel tense or panicky when I think about exams or results." },
  { area: "overthinking", text: "I replay conversations or mistakes in my head long after they happen." },
  { area: "focus", text: "I find it hard to concentrate when I sit down to study." },
  { area: "sleep", text: "I lie awake at night because my mind won't switch off." },
  { area: "overwhelm", text: "I feel like there's too much to do and I don't know where to start." },
  { area: "exams", text: "I worry about letting my family or teachers down with my marks." },
  { area: "overthinking", text: "My mind jumps to the worst thing that could happen." },
  { area: "focus", text: "I read the same page again and again without taking it in." },
  { area: "sleep", text: "I wake up tired, even after a full night in bed." },
  { area: "overwhelm", text: "Small things make me want to cry, snap at someone, or shut down." },
];

const ANSWERS = [
  { label: "Never", value: 0, tone: "bg-mint-soft text-[#1f8a6b] border-mint/40", emoji: "🌤️" },
  { label: "Sometimes", value: 1, tone: "bg-sky-soft text-sky border-sky/40", emoji: "⛅" },
  { label: "Often", value: 2, tone: "bg-sun-soft text-[#a26a00] border-sun/50", emoji: "🌥️" },
  { label: "Almost always", value: 3, tone: "bg-coral-soft text-coral border-coral/40", emoji: "🌧️" },
];

type Tip = { text: string; href?: (ctx: ReturnType<typeof useToolContext>) => string; cta?: string };

const AREAS: Record<Area, { title: string; icon: typeof Brain; color: string; soft: string; intro: string; tips: Tip[] }> = {
  exams: {
    title: "Exam pressure",
    icon: CalendarRange,
    color: "#e0962a",
    soft: "bg-sun-soft",
    intro: "Exams seem to be weighing on you. A plan you can actually stick to takes a lot of the panic away.",
    tips: [
      { text: "Make a realistic study timetable with breaks and a rest day built in.", href: (c) => `${toolHref(c, "exams")}#plan`, cta: "Build my timetable" },
      { text: "Before you start revising, do one minute of slow breathing. It tells your body you're safe." },
      { text: "Your marks are information, not your worth. Find words for talking to family about results.", href: (c) => toolHref(c, "exams"), cta: "Exam stress kit" },
    ],
  },
  overthinking: {
    title: "Overthinking",
    icon: Brain,
    color: "#7569cc",
    soft: "bg-lilac-soft",
    intro: "Your mind has been busy replaying and predicting. Getting thoughts out of your head and onto paper helps.",
    tips: [
      { text: "Write the thought down and sort what you actually know from what you fear.", href: (c) => toolHref(c, "untangle"), cta: "Untangle a thought" },
      { text: "Give worries a 10-minute “worry time” each day. When they pop up outside it, note them for later." },
      { text: "Ask yourself: would I say this to a friend? Then say that to yourself instead." },
    ],
  },
  focus: {
    title: "Concentration",
    icon: Focus,
    color: "#2f7cc0",
    soft: "bg-sky-soft",
    intro: "Focus has been hard. That's very common under stress, and small changes make a real difference.",
    tips: [
      { text: "Try 25 minutes of study, then a 5 minute break away from the screen. Repeat four times, then take a longer break." },
      { text: "Put your phone in another room (not just face down) while you study." },
      { text: "Before each session, write the one tiny thing you'll finish, like “5 practice questions”." },
      { text: "Read actively: close the book and explain the page out loud, or make quick questions to test yourself." },
    ],
  },
  sleep: {
    title: "Sleep",
    icon: BedDouble,
    color: "#5b6fb3",
    soft: "bg-grape-soft",
    intro: "Sleep hasn't been restful. Tired brains worry more and focus less, so this one matters.",
    tips: [
      { text: "Screens off 30 to 60 minutes before bed. Swap them for music, a shower or a book." },
      { text: "Do a “brain dump” before bed: write tomorrow's to-do list so your mind can let go of it." },
      { text: "Wake up at the same time every day, even at weekends. It resets your body clock faster than anything." },
      { text: "If you can't sleep after 20 minutes, get up, do something calm in dim light, then try again." },
    ],
  },
  overwhelm: {
    title: "Feeling overwhelmed",
    icon: Layers,
    color: "#d4573f",
    soft: "bg-coral-soft",
    intro: "There's a lot on your plate. You don't have to sort all of it today, just the next small step.",
    tips: [
      { text: "List everything on your mind, then circle just ONE thing to do next.", href: (c) => toolHref(c, "reset"), cta: "Bad-day reset" },
      { text: "Take a real break: a short walk, a glass of water, fresh air. Breaks are part of working well." },
      { text: "Ask for help with one thing, from a friend, family member, teacher or your counselor." },
    ],
  },
};

function level(total: number) {
  if (total >= 19) return { key: "high", title: "You're carrying a lot right now", emoji: "🌧️", color: "from-coral-soft via-rose-soft to-lilac-soft" } as const;
  if (total >= 10) return { key: "some", title: "Some pressure is building up", emoji: "🌥️", color: "from-sun-soft via-coral-soft to-rose-soft" } as const;
  return { key: "low", title: "You seem fairly steady at the moment", emoji: "🌤️", color: "from-mint-soft via-sky-soft to-sun-soft" } as const;
}

export function CheckInTool() {
  const context = useToolContext();
  const send = useSendToCounselor();
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const advancing = useRef(false);
  const done = answers.length === QUESTIONS.length && index >= QUESTIONS.length;

  const answer = (value: number) => {
    if (advancing.current) return;
    advancing.current = true;
    setAnswers((a) => {
      const next = [...a];
      next[index] = value;
      return next;
    });
    setTimeout(() => {
      advancing.current = false;
      setIndex((i) => i + 1);
    }, 180);
  };

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) answer(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const restart = () => {
    setAnswers([]);
    setIndex(0);
  };

  if (done) {
    const total = answers.reduce((a, b) => a + b, 0);
    const lvl = level(total);
    const scores = (Object.keys(AREAS) as Area[]).map((area) => ({
      area,
      score: QUESTIONS.reduce((sum, q, i) => (q.area === area ? sum + answers[i] : sum), 0),
    }));
    const focusAreas = scores.filter((s) => s.score >= 3).sort((a, b) => b.score - a.score);
    const struggling = lvl.key === "high" || answers[9] === 3 || scores.some((s) => s.score === 6);

    const summary = [
      "I did the “Check in with yourself” questions and wanted to share how I've been feeling.",
      "",
      ...scores.map((s) => `• ${AREAS[s.area].title}: ${["not really", "a little", "a little", "quite a lot", "quite a lot", "a lot", "a lot"][s.score]}`),
      "",
      "Could we talk about it?",
    ].join("\n");

    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 sm:p-8", lvl.color)}
        >
          <p className="text-4xl" aria-hidden>
            {lvl.emoji}
          </p>
          <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">{lvl.title}</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-2">
            {lvl.key === "low"
              ? "Most things feel manageable right now. Keep doing what's working, and come back to this whenever things change."
              : lvl.key === "some"
                ? "A few things are getting to you. That's really common, especially around exams. The ideas below are a good place to start."
                : "It sounds like things have been really hard lately. You don't have to handle this on your own, and talking to someone can make a real difference."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {scores.map(({ area, score }) => {
              const a = AREAS[area];
              return (
                <div key={area} className="rounded-2xl bg-surface/85 p-3 shadow-sm backdrop-blur">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <a.icon className="size-3.5" style={{ color: a.color }} /> {a.title}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${a.title}: ${score} out of 6`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: a.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(6, (score / 6) * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-3">{score <= 1 ? "Doing okay" : score <= 3 ? "A bit" : "Quite a lot"}</p>
                </div>
              );
            })}
          </div>
        </motion.section>

        {struggling && (
          <section className="flex flex-col gap-4 rounded-3xl border-2 border-primary/30 bg-primary-soft/60 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-ink">
              <HeartHandshake className="size-6" />
            </span>
            <div className="flex-1">
              <p className="font-medium text-ink">Please talk to someone you trust</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
                Your answers suggest you&apos;re under a lot of stress. A counselor, teacher, parent or another adult you trust can
                help you carry it. You could share these results to start the conversation.
              </p>
            </div>
            <Button onClick={() => send({ subject: "My check-in results", body: summary, category: "wellbeing" })}>
              <Send /> {context === "student" ? "Send to my counselor" : "Talk to a counselor"}
            </Button>
          </section>
        )}

        {focusAreas.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {focusAreas.map(({ area }, i) => {
              const a = AREAS[area];
              return (
                <motion.section
                  key={area}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
                >
                  <p className="flex items-center gap-2 font-display text-lg text-ink">
                    <span className={cn("flex size-9 items-center justify-center rounded-xl", a.soft)}>
                      <a.icon className="size-4.5" style={{ color: a.color }} />
                    </span>
                    {a.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{a.intro}</p>
                  <ul className="mt-4 space-y-3">
                    {a.tips.map((t) => (
                      <li key={t.text} className="flex gap-2.5 text-sm leading-relaxed text-ink">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span>
                          {t.text}
                          {t.href && (
                            <Link href={t.href(context)} className="ml-1.5 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              {t.cta} <ArrowRight className="size-3.5" />
                            </Link>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.section>
              );
            })}
          </div>
        ) : (
          <section className="rounded-3xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2 shadow-sm">
            <p className="font-medium text-ink">Keep your good habits going</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Keep regular sleep and wake-up times, even at weekends.</li>
              <li>Take short breaks while studying, away from screens.</li>
              <li>Notice what&apos;s helping you right now, so you can come back to it on harder days.</li>
            </ul>
          </section>
        )}

        <section className="rounded-3xl border border-line bg-surface px-5 shadow-sm sm:px-8">
          <p className="pt-6 text-center font-medium text-ink">Try one minute of slow breathing now</p>
          <Breathing compact />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={restart}>
            <RotateCcw /> Start again
          </Button>
          {!struggling && (
            <Button variant="ghost" onClick={() => send({ subject: "My check-in results", body: summary, category: "wellbeing" })}>
              <Send /> {context === "student" ? "Share with my counselor" : "Talk to a counselor"}
            </Button>
          )}
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          This check-in isn&apos;t a test or a diagnosis, and it can&apos;t tell you whether you have any condition. It&apos;s a way to
          notice how you&apos;ve been feeling. Your answers stay on this device and disappear when you leave this page. If you ever feel
          unsafe, tell a trusted adult straight away or contact your local emergency number.
        </p>
      </div>
    );
  }

  const q = QUESTIONS[Math.min(index, QUESTIONS.length - 1)];
  const area = AREAS[q.area];
  const progress = (answers.filter((a) => a !== undefined).length / QUESTIONS.length) * 100;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-sky-soft/70 p-4 text-sm leading-relaxed text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-sky" />
        Think about the last two weeks. There are no right or wrong answers, and this isn&apos;t a test or a diagnosis. Nothing is
        saved or sent anywhere.
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="h-2 bg-surface-2">
          <motion.div className="h-full rounded-r-full bg-gradient-to-r from-mint via-sky to-grape" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <div className="p-6 sm:p-10">
          <div className="flex items-center justify-between text-xs font-medium text-ink-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: `${area.color}1a`, color: area.color }}>
              <area.icon className="size-3.5" /> {area.title}
            </span>
            <span>
              {index + 1} of {QUESTIONS.length}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
              <h2 className="mt-5 font-display text-2xl leading-snug text-ink sm:text-[1.75rem]">{q.text}</h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-4" role="radiogroup" aria-label="How often?">
                {ANSWERS.map((a, i) => (
                  <button
                    key={a.label}
                    role="radio"
                    aria-checked={answers[index] === a.value}
                    onClick={() => answer(a.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-medium transition hover:-translate-y-0.5 hover:shadow-md sm:flex-col sm:text-center",
                      answers[index] === a.value ? a.tone : "border-line bg-surface text-ink hover:border-line-strong",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {a.emoji}
                    </span>
                    <span className="flex-1">{a.label}</span>
                    <kbd className="hidden rounded-md border border-line bg-surface-2 px-1.5 text-[10px] text-ink-3 sm:inline">{i + 1}</kbd>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ArrowLeft /> Back
            </Button>
            {answers[index] !== undefined && index < QUESTIONS.length - 1 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i + 1)}>
                Next <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
