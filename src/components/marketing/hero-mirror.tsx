"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck, CheckCheck, Lock, Sparkles, TrendingUp } from "lucide-react";

const SCENES = [
  {
    surface: "I'm fine.",
    student: "Honestly? I haven't slept properly since results came out.",
    counselor: "Thank you for telling me. Would it help to talk tomorrow at 10?",
    outcome: { icon: CalendarCheck, text: "Session booked · Tomorrow, 10:00" },
  },
  {
    surface: "It's nothing.",
    student: "My friends stopped saving me a seat at lunch. I don't know what I did.",
    counselor: "That sounds really lonely. Let's figure out what's going on together.",
    outcome: { icon: TrendingUp, text: "In progress · Friendships" },
  },
  {
    surface: "Just tired.",
    student: "Things at home are loud right now and I can't focus on revision.",
    counselor: "You're not alone in this. Here's a plan for this week, and my door's open.",
    outcome: { icon: CheckCheck, text: "Resolved · “It really helped”" },
  },
];

const STEP_MS = 1500;

export function HeroMirror() {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [step, setStep] = useState(reduce ? 4 : 0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(
      () => {
        if (step < 4) setStep(step + 1);
        else {
          setScene((s) => (s + 1) % SCENES.length);
          setStep(0);
        }
      },
      step === 4 ? 3200 : step === 0 ? 1700 : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [step, reduce]);

  const s = SCENES[scene];

  return (
    <div className="relative mx-auto w-full max-w-[400px]">
      {/* Mirror frame */}
      <div className="arch relative aspect-[4/5.2] border border-line-strong bg-surface p-3 shadow-lg">
        <div className="arch relative h-full overflow-hidden bg-gradient-to-b from-lilac-soft via-surface to-primary-soft/70">
          <div className="paper-grain absolute inset-0 opacity-60" aria-hidden />
          <div className="glass-sheen absolute inset-0 animate-[fade-in_1s_ease-out]" aria-hidden />

          <div className="relative flex h-full flex-col justify-end gap-3 px-5 pb-7 pt-20 sm:px-6" aria-live="off">
            <AnimatePresence mode="popLayout">
              {/* The reflection: what people usually say */}
              <motion.p
                key={`surface-${scene}`}
                initial={{ opacity: 0, filter: "blur(6px)" }}
                animate={
                  step === 0
                    ? { opacity: 1, filter: "blur(0px)", scale: 1 }
                    : { opacity: 0.35, filter: "blur(1.5px)", scale: 0.92 }
                }
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-x-0 top-[22%] text-center font-display text-4xl italic text-ink-2"
              >
                {s.surface}
              </motion.p>

              {step >= 1 && (
                <motion.div
                  key={`student-${scene}`}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="ml-auto max-w-[88%] rounded-[20px] rounded-br-md bg-primary px-4 py-3 text-[14px] leading-relaxed text-primary-ink shadow-md"
                >
                  {s.student}
                </motion.div>
              )}
              {step >= 2 && (
                <motion.p
                  key={`seen-${scene}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="-mt-1.5 flex items-center justify-end gap-1 text-[11px] text-primary"
                >
                  <CheckCheck className="size-3.5" /> Seen
                </motion.p>
              )}
              {step >= 3 && (
                <motion.div
                  key={`counselor-${scene}`}
                  layout
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="mr-auto max-w-[88%]"
                >
                  <p className="mb-1 ml-1 text-[11px] font-medium text-ink-3">Your counselor</p>
                  <div className="rounded-[20px] rounded-bl-md border border-line bg-surface px-4 py-3 text-[14px] leading-relaxed text-ink shadow-md">
                    {s.counselor}
                  </div>
                </motion.div>
              )}
              {step >= 4 && (
                <motion.div
                  key={`outcome-${scene}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="mx-auto mt-1 inline-flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3.5 py-1.5 text-xs font-medium text-ink shadow-sm backdrop-blur"
                >
                  <s.outcome.icon className="size-3.5 text-primary" /> {s.outcome.text}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Scene indicator */}
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
        {SCENES.map((_, i) => (
          <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === scene ? "w-6 bg-primary" : "w-1.5 bg-line-strong"}`} />
        ))}
      </div>

      {/* Floating annotations */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -left-20 top-16 hidden items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-ink shadow-md xl:flex"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-ink">
          <Lock className="size-3.5" />
        </span>
        Only your counselor
        <br />
        can read this
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.6, duration: 0.6 }}
        className="absolute -right-14 top-40 hidden items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs font-medium text-ink shadow-md xl:flex"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-lilac-soft text-lilac">
          <Sparkles className="size-3.5" />
        </span>
        Self-help tools
        <br />
        for in between
      </motion.div>
    </div>
  );
}
