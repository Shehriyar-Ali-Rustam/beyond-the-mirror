"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Play, RotateCcw, Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Confetti, pick, useLocalNumber } from "./shared";

const ROUND = 30;
const CELLS = 9;

const MONSTERS = [
  { label: "Homework", face: "😩", color: "#ef6a55" },
  { label: "Deadline", face: "⏰", color: "#f39a3d" },
  { label: "Overthinking", face: "🤯", color: "#9b85dd" },
  { label: "Nerves", face: "😰", color: "#4b9fe1" },
  { label: "Drama", face: "🙄", color: "#e86a9a" },
  { label: "Pressure", face: "😤", color: "#d4573f" },
  { label: "Worry", face: "😟", color: "#36507a" },
  { label: "Mess", face: "🌀", color: "#34b892" },
];
const CALM = { label: "Calm star", face: "🌟", color: "#f5b82e" };

type Mole = { id: number; cell: number; kind: (typeof MONSTERS)[number] | typeof CALM; until: number; points: number };
type Pop = { id: number; cell: number; points: number };

const CHEERS = [
  "That felt good, didn't it?",
  "Stress: smashed. You: lighter.",
  "Nice reflexes! Now take one slow breath.",
  "Look at you go. Your stress didn't stand a chance.",
];

export function SmashGame() {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [score, setScore] = useState(0);
  const [smashed, setSmashed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [best, setBest] = useLocalNumber("smash-best");
  const [newBest, setNewBest] = useState(false);
  const [cheer, setCheer] = useState(CHEERS[0]);
  const ids = useRef(0);
  const startedAt = useRef(0);
  const scoreRef = useRef(0);

  const finish = useCallback(() => {
    setPhase("over");
    setMoles([]);
    setCheer(pick(CHEERS));
    const final = scoreRef.current;
    setNewBest(final > best);
    if (final > best) setBest(final);
  }, [best, setBest]);

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - startedAt.current) / 1000;
      const left = Math.max(0, ROUND - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        finish();
        return;
      }
      // Faster and busier as the round goes on.
      const speed = 1 + elapsed / ROUND;
      setMoles((current) => {
        const alive = current.filter((m) => m.until > now);
        const max = elapsed < 10 ? 2 : elapsed < 20 ? 3 : 4;
        if (alive.length < max && Math.random() < 0.35 * speed) {
          const free = Array.from({ length: CELLS }, (_, i) => i).filter((c) => !alive.some((m) => m.cell === c));
          if (free.length) {
            const calm = Math.random() < 0.08;
            alive.push({
              id: ++ids.current,
              cell: pick(free),
              kind: calm ? CALM : pick(MONSTERS),
              until: now + (calm ? 900 : 1500 / speed + Math.random() * 500),
              points: calm ? 30 : 10,
            });
          }
        }
        return alive;
      });
    }, 100);
    return () => clearInterval(t);
  }, [phase, finish]);

  const start = () => {
    setScore(0);
    scoreRef.current = 0;
    setSmashed(0);
    setTimeLeft(ROUND);
    setMoles([]);
    setPops([]);
    setNewBest(false);
    startedAt.current = performance.now();
    setPhase("playing");
  };

  const smash = (mole: Mole) => {
    setMoles((m) => m.filter((x) => x.id !== mole.id));
    scoreRef.current += mole.points;
    setScore(scoreRef.current);
    setSmashed((s) => s + 1);
    const pop = { id: mole.id, cell: mole.cell, points: mole.points };
    setPops((p) => [...p, pop]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 650);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-surface p-3 shadow-sm">
          <p className="text-xs text-ink-3">Score</p>
          <p className="font-display text-2xl tabular-nums text-ink">{score}</p>
        </div>
        <div className="rounded-2xl bg-surface p-3 shadow-sm">
          <p className="flex items-center justify-center gap-1 text-xs text-ink-3">
            <Timer className="size-3" /> Time
          </p>
          <p className={cn("font-display text-2xl tabular-nums", timeLeft < 5 && phase === "playing" ? "text-danger" : "text-ink")}>{Math.ceil(timeLeft)}s</p>
        </div>
        <div className="rounded-2xl bg-surface p-3 shadow-sm">
          <p className="flex items-center justify-center gap-1 text-xs text-ink-3">
            <Trophy className="size-3" /> Best
          </p>
          <p className="font-display text-2xl tabular-nums text-ink">{best}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#bfe6d5] to-[#8fd3b6] p-4 shadow-lg sm:p-6">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/50">
          <div className="h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${(timeLeft / ROUND) * 100}%` }} />
        </div>
        <div className="mt-4 grid select-none grid-cols-3 gap-3 sm:gap-5" style={{ touchAction: "manipulation" }}>
          {Array.from({ length: CELLS }, (_, cell) => {
            const mole = moles.find((m) => m.cell === cell);
            const pop = pops.find((p) => p.cell === cell);
            return (
              <div key={cell} className="relative aspect-square">
                {/* The hole */}
                <div className="absolute inset-x-[8%] bottom-[6%] h-[28%] rounded-[50%] bg-[#2f6b55]/70 shadow-[inset_0_6px_10px_rgba(0,0,0,0.35)]" />
                <div className="absolute inset-0 overflow-hidden rounded-b-[40%]">
                  <AnimatePresence>
                    {mole && (
                      <motion.button
                        key={mole.id}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          smash(mole);
                        }}
                        aria-label={`Smash ${mole.kind.label}`}
                        initial={{ y: "100%" }}
                        animate={{ y: "8%" }}
                        exit={{ y: "100%", transition: { duration: 0.15 } }}
                        transition={{ type: "spring", stiffness: 500, damping: 26 }}
                        className="arch absolute inset-x-[14%] bottom-[12%] top-[6%] flex cursor-pointer flex-col items-center justify-center text-white shadow-md"
                        style={{ background: mole.kind.color }}
                      >
                        <span className="text-3xl sm:text-4xl">{mole.kind.face}</span>
                        <span className="mt-0.5 max-w-full truncate px-1 text-[9px] font-bold uppercase tracking-wide sm:text-[11px]">{mole.kind.label}</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
                {pop && (
                  <>
                    <span className="pointer-events-none absolute inset-0 m-auto size-16 rounded-full border-4 border-white" style={{ animation: "pop-out 0.4s ease-out forwards" }} />
                    <span
                      className="pointer-events-none absolute inset-x-0 top-1 text-center font-display text-xl font-bold text-white drop-shadow"
                      style={{ animation: "float-up 0.65s ease-out forwards" }}
                    >
                      +{pop.points}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {phase !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/75 p-6 text-center backdrop-blur-sm"
            >
              {phase === "ready" ? (
                <>
                  <p className="text-5xl">💥</p>
                  <p className="mt-3 font-display text-2xl text-ink">Ready to smash some stress?</p>
                  <p className="mt-1 max-w-sm text-sm text-ink-2">Tap the stress monsters before they hide. Golden calm stars 🌟 are worth triple!</p>
                  <Button size="lg" className="mt-5 rounded-full" onClick={start}>
                    <Play /> Start
                  </Button>
                </>
              ) : (
                <>
                  {newBest && <Confetti />}
                  <p className="text-5xl">{newBest ? "🏆" : "✨"}</p>
                  <p className="mt-3 font-display text-3xl text-ink">{score} points</p>
                  <p className="mt-1 text-sm text-ink-2">
                    {newBest ? "New personal best!" : `You smashed ${smashed} stress ${smashed === 1 ? "monster" : "monsters"}.`}
                  </p>
                  <p className="mt-3 max-w-sm text-[15px] text-ink">{cheer}</p>
                  <Button size="lg" className="mt-5 rounded-full" onClick={start}>
                    <RotateCcw /> Play again
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-ink-3">Your best score is saved on this device only.</p>
    </div>
  );
}
