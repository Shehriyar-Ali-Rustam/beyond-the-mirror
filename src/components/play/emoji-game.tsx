"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Lightbulb, RotateCcw, SkipForward, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EMOJI_CATEGORIES, EMOJI_LEVELS, EMOJI_PUZZLES, type EmojiCategory, type EmojiLevel, type EmojiPuzzle } from "./emoji-puzzles";
import { Confetti, normalizeAnswer, useLocalList, useLocalNumber } from "./shared";

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

function isCorrect(p: EmojiPuzzle, guess: string) {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  return [p.answer, ...(p.alts ?? [])].some((a) => {
    const n = normalizeAnswer(a);
    // Allow a small typo in longer answers.
    return n === g || n.replace(/ /g, "") === g.replace(/ /g, "") || (n.length >= 6 && distance(n, g) <= 1);
  });
}

/** "The Lion King" -> "T__ L___ K___" */
const letterHint = (answer: string) => answer.replace(/[A-Za-z]/g, (c, i) => (i === 0 || answer[i - 1] === " " ? c : "_"));

export function EmojiGame() {
  const [level, setLevel] = useState<EmojiLevel>("easy");
  const [category, setCategory] = useState<EmojiCategory | "all">("all");
  const [solved, addSolved, resetSolved] = useLocalList("emoji-solved");
  const [points, setPoints] = useLocalNumber("emoji-points");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [guess, setGuess] = useState("");
  const [hinted, setHinted] = useState(false);
  const [state, setState] = useState<"guessing" | "wrong" | "right" | "revealed">("guessing");
  const [wrongCount, setWrongCount] = useState(0);
  const [burst, setBurst] = useState(0);

  const pool = useMemo(
    () => EMOJI_PUZZLES.filter((p) => p.level === level && (category === "all" || p.category === category)),
    [level, category],
  );
  const remaining = pool.filter((p) => !solved.includes(p.id) && !skipped.includes(p.id));
  const [currentId, setCurrentId] = useState<string | null>(null);
  const current = pool.find((p) => p.id === currentId && (state !== "guessing" || !solved.includes(p.id))) ?? remaining[0] ?? null;
  const lvl = EMOJI_LEVELS.find((l) => l.id === level)!;

  const reset = () => {
    setGuess("");
    setHinted(false);
    setState("guessing");
    setWrongCount(0);
  };
  const next = () => {
    reset();
    const after = remaining.filter((p) => p.id !== current?.id);
    setCurrentId(after[0]?.id ?? null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || state === "right" || state === "revealed") return;
    if (isCorrect(current, guess)) {
      setState("right");
      setCurrentId(current.id);
      addSolved(current.id);
      setPoints((p) => p + (hinted ? lvl.points / 2 : lvl.points));
      setBurst((b) => b + 1);
    } else {
      setState("wrong");
      setWrongCount((w) => w + 1);
      setTimeout(() => setState((s) => (s === "wrong" ? "guessing" : s)), 450);
    }
  };

  const solvedInPool = pool.filter((p) => solved.includes(p.id)).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-surface p-1 shadow-sm" role="tablist" aria-label="Level">
          {EMOJI_LEVELS.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={level === l.id}
              onClick={() => {
                setLevel(l.id);
                setSkipped([]);
                setCurrentId(null);
                reset();
              }}
              className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", level === l.id ? "text-white shadow-sm" : "text-ink-2 hover:text-ink")}
              style={level === l.id ? { background: l.color } : undefined}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink shadow-sm">
          <Star className="size-4 fill-sun text-sun" /> {points} points
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[{ id: "all" as const, label: "All", emoji: "✨" }, ...EMOJI_CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              setSkipped([]);
              setCurrentId(null);
              reset();
            }}
            aria-pressed={category === c.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
              category === c.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
            )}
          >
            <span aria-hidden>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun-soft via-coral-soft to-mint-soft p-6 shadow-sm sm:p-10">
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/60">
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(solvedInPool / Math.max(1, pool.length)) * 100}%`, background: lvl.color }} />
        </div>
        <p className="text-center text-xs font-medium text-ink-2">
          {solvedInPool} of {pool.length} solved at this level
        </p>

        <AnimatePresence mode="wait">
          {current ? (
            <motion.div key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="relative mt-4 text-center">
              {state === "right" && <Confetti key={burst} />}
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                {EMOJI_CATEGORIES.find((c) => c.id === current.category)?.emoji} {EMOJI_CATEGORIES.find((c) => c.id === current.category)?.label}
              </p>
              <motion.p
                className={cn("mt-4 select-none text-6xl leading-tight tracking-widest sm:text-7xl", state === "wrong" && "animate-shake")}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {current.emoji}
              </motion.p>

              {state === "right" || state === "revealed" ? (
                <div className="mt-6">
                  <p className={cn("inline-flex items-center gap-2 font-display text-2xl", state === "right" ? "text-ok" : "text-ink")}>
                    {state === "right" && <Check className="size-6" />} {current.answer}
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{state === "right" ? `+${hinted ? lvl.points / 2 : lvl.points} points. Nice one!` : "Now you know for next time."}</p>
                  <Button size="lg" className="mt-5 rounded-full" onClick={next}>
                    Next puzzle <ArrowRight />
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="mx-auto mt-6 max-w-md">
                  {hinted && (
                    <p className="mb-3 font-mono text-lg tracking-[0.2em] text-ink" aria-label={`Hint: ${current.hint}`}>
                      {letterHint(current.answer)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Type your guess" aria-label="Your guess" autoComplete="off" className="bg-surface" />
                    <Button type="submit" size="lg" className="h-11 rounded-xl">
                      Guess
                    </Button>
                  </div>
                  {state === "wrong" || wrongCount > 0 ? (
                    <p className="mt-2 text-sm text-ink-2" aria-live="polite">
                      Not quite. {hinted ? `Clue: ${current.hint}.` : "Try again, or take a hint."}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {!hinted && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setHinted(true)}>
                        <Lightbulb /> Hint (half points)
                      </Button>
                    )}
                    {wrongCount >= 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCurrentId(current.id);
                          setSkipped((s) => [...s, current.id]);
                          setState("revealed");
                        }}
                      >
                        Show answer
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSkipped((s) => [...s, current.id]);
                        setCurrentId(null);
                        reset();
                      }}
                    >
                      <SkipForward /> Skip
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
              <p className="text-5xl">{solvedInPool === pool.length ? "🏆" : "👀"}</p>
              <p className="mt-3 font-display text-2xl text-ink">{solvedInPool === pool.length ? "You solved them all!" : "That's all for now"}</p>
              <p className="mt-1 text-sm text-ink-2">
                {solvedInPool === pool.length ? "Try another level or category." : "You skipped a few. Want another go at them?"}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {skipped.length > 0 && (
                  <Button onClick={() => setSkipped([])}>
                    <RotateCcw /> Try skipped ones
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!confirm("Clear all solved puzzles and points on this device?")) return;
                    resetSolved();
                    setPoints(0);
                    setSkipped([]);
                  }}
                >
                  Start over
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-ink-3">Progress is saved on this device only.</p>
    </div>
  );
}
