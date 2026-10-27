"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { READY_DOODLES, type ReadyDoodle } from "./doodle-art";
import { Confetti, normalizeAnswer, useLocalNumber } from "./shared";

const STROKE_SECONDS = 0.55;

function shuffled<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Guess our ready-made doodles while they're being drawn. Faster guesses score more. */
export function DoodlePractice() {
  const [order, setOrder] = useState<ReadyDoodle[] | null>(null);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [state, setState] = useState<"guessing" | "wrong" | "right" | "revealed">("guessing");
  const [tries, setTries] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [earned, setEarned] = useState(0);
  const [points, setPoints] = useLocalNumber("doodle-points");

  // Shuffled on the client only, so the server and browser render the same first frame.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random order must be picked after hydration
    setOrder(shuffled(READY_DOODLES));
    setStartedAt(Date.now());
  }, []);

  if (!order) return <div className="mx-auto aspect-square w-full max-w-sm rounded-[2rem] bg-surface shadow-lg ring-1 ring-line" />;
  const doodle = order[index % order.length];
  const drawTime = doodle.paths.length * STROKE_SECONDS;

  const next = () => {
    setIndex((i) => i + 1);
    setGuess("");
    setState("guessing");
    setTries(0);
    setStartedAt(Date.now());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "right" || state === "revealed") return;
    const g = normalizeAnswer(guess);
    if (!g) return;
    const ok = [doodle.word, ...(doodle.alts ?? [])].some((w) => normalizeAnswer(w) === g);
    if (ok) {
      const quick = (Date.now() - startedAt) / 1000 < drawTime;
      const pts = quick ? 30 : 20;
      setEarned(pts);
      setPoints((p) => p + pts);
      setState("right");
    } else {
      setTries((t) => t + 1);
      setState("wrong");
      setTimeout(() => setState((s) => (s === "wrong" ? "guessing" : s)), 450);
      if (tries + 1 >= 3) setState("revealed");
    }
  };

  const blanks = doodle.word.replace(/[a-z]/g, "_ ").replace(/ {2}/g, "   ");

  return (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-square w-full max-w-sm rounded-[2rem] bg-surface p-6 shadow-lg ring-1 ring-line">
        {state === "right" && <Confetti key={index} />}
        <svg key={doodle.id + index} viewBox="0 0 200 200" className="h-full w-full" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="A doodle to guess">
          {doodle.paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              stroke={doodle.color}
              strokeWidth={5}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ pathLength: { delay: i * STROKE_SECONDS, duration: STROKE_SECONDS, ease: "easeInOut" }, opacity: { delay: i * STROKE_SECONDS, duration: 0.01 } }}
            />
          ))}
        </svg>
        <span className="absolute right-4 top-4 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-3">
          {(index % order.length) + 1} / {order.length}
        </span>
      </div>

      <div>
        <p className="text-sm font-medium text-ink-3">What is it? Guess before it&apos;s finished for bonus points.</p>
        <p className="mt-3 font-mono text-3xl tracking-wider text-ink" aria-label={`${doodle.word.length} letters`}>
          {state === "right" || state === "revealed" ? doodle.word : blanks}
        </p>

        {state === "right" || state === "revealed" ? (
          <div className="mt-5">
            <p className={cn("font-display text-xl", state === "right" ? "text-ok" : "text-ink")}>
              {state === "right" ? `Yes! +${earned} points${earned === 30 ? " (speedy!)" : ""}` : "Tricky one! Here's the answer."}
            </p>
            <Button size="lg" className="mt-4 rounded-full" onClick={next}>
              Next doodle <ArrowRight />
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5">
            <div className={cn("flex gap-2", state === "wrong" && "animate-shake")}>
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess" aria-label="Your guess" autoComplete="off" />
              <Button type="submit" className="h-11">
                Guess
              </Button>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-ink-3">
              <span>{tries > 0 ? `${3 - tries} ${3 - tries === 1 ? "try" : "tries"} left` : "3 tries"}</span>
              <button type="button" onClick={() => setState("revealed")} className="inline-flex items-center gap-1 hover:text-ink">
                <Eye className="size-3.5" /> Show me
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm">
          <Star className="size-4 fill-sun text-sun" /> {points} doodle points
        </p>
      </div>
    </div>
  );
}
