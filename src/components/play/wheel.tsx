"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti, useLocalNumber } from "./shared";

const SEGMENTS = [
  { label: "Move", emoji: "💃", color: "#ef6a55", challenges: ["Dance like nobody's watching for one whole song.", "Do 10 jumping jacks, then shake out your arms.", "Walk around your room (or the block) for 3 minutes.", "Stretch up to the ceiling, then touch your toes. Do it 5 times."] },
  { label: "Kind", emoji: "💌", color: "#e86a9a", challenges: ["Send a friend a message telling them one thing you like about them.", "Give someone a real compliment today.", "Thank someone who helped you this week.", "Write a kind sticky note and leave it somewhere for someone to find."] },
  { label: "Silly", emoji: "🤪", color: "#f5b82e", challenges: ["Make the silliest face you can and hold it for 10 seconds.", "Say the alphabet backwards as fast as you can.", "Talk in a pirate voice for the next minute.", "Try to lick your elbow. (Yes, really. Almost nobody can.)"] },
  { label: "Calm", emoji: "🫧", color: "#4b9fe1", challenges: ["Take 5 slow breaths: in for 4, out for 6.", "Look out of a window for one minute and notice 3 things.", "Close your eyes and listen. How many different sounds can you hear?", "Drink a full glass of water, slowly."] },
  { label: "Create", emoji: "🎨", color: "#9b85dd", challenges: ["Draw a cat in 30 seconds. Bonus points for a hat.", "Write a 3-line poem about your breakfast.", "Hum your favourite song and see if someone can guess it.", "Make up a name for a new ice-cream flavour."] },
  { label: "Notice", emoji: "🔎", color: "#34b892", challenges: ["Find 5 things around you that are green.", "Name 3 things that made you smile this week.", "Write down one thing you're proud of from today.", "Spot something you've never noticed in a room you know well."] },
  { label: "Tidy", emoji: "🧺", color: "#f39a3d", challenges: ["Tidy one small thing: a drawer, your desk, or your bag.", "Delete 10 photos you don't need from your phone.", "Put on fresh socks. Small upgrade, big feeling.", "Clear just your desk. Notice how it feels after."] },
  { label: "Treat", emoji: "🍪", color: "#36507a", challenges: ["Make yourself a warm drink and enjoy it without your phone.", "Listen to a song that always cheers you up.", "Plan one small fun thing for the weekend.", "Give yourself permission to rest for 10 minutes. Guilt-free."] },
];

const SIZE = 320;
const R = SIZE / 2;
const SLICE = 360 / SEGMENTS.length;

function slicePath(i: number) {
  const a0 = ((i * SLICE - 90) * Math.PI) / 180;
  const a1 = (((i + 1) * SLICE - 90) * Math.PI) / 180;
  return `M${R},${R} L${R + R * Math.cos(a0)},${R + R * Math.sin(a0)} A${R},${R} 0 0 1 ${R + R * Math.cos(a1)},${R + R * Math.sin(a1)} Z`;
}

export function WheelGame() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ seg: (typeof SEGMENTS)[number]; text: string } | null>(null);
  const [done, setDone] = useLocalNumber("wheel-done");
  const [celebrate, setCelebrate] = useState(0);

  const spin = () => {
    if (spinning) return;
    setResult(null);
    setSpinning(true);
    const index = Math.floor(Math.random() * SEGMENTS.length);
    // Land the middle of the chosen slice under the pointer (top), with a little wobble.
    const target = 360 - (index * SLICE + SLICE / 2) + (Math.random() - 0.5) * SLICE * 0.6;
    const base = rotation - (rotation % 360);
    setRotation(base + 360 * 5 + target);
    setTimeout(() => {
      const seg = SEGMENTS[index];
      setResult({ seg, text: seg.challenges[Math.floor(Math.random() * seg.challenges.length)] });
      setSpinning(false);
    }, 4200);
  };

  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="relative mx-auto w-full max-w-[340px]">
        {/* Pointer */}
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
          <svg width="34" height="40" viewBox="0 0 34 40" aria-hidden>
            <path d="M17 38 3 8a14 14 0 1 1 28 0Z" fill="#15201c" />
            <circle cx="17" cy="13" r="5" fill="#fff" />
          </svg>
        </div>
        <motion.div
          className="rounded-full border-[10px] border-surface shadow-lg"
          animate={{ rotate: rotation }}
          transition={{ duration: 4.1, ease: [0.12, 0.8, 0.2, 1] }}
        >
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="block h-auto w-full" role="img" aria-label="Fun wheel">
            {SEGMENTS.map((s, i) => {
              const mid = ((i * SLICE + SLICE / 2 - 90) * Math.PI) / 180;
              const tx = R + R * 0.66 * Math.cos(mid);
              const ty = R + R * 0.66 * Math.sin(mid);
              return (
                <g key={s.label}>
                  <path d={slicePath(i)} fill={s.color} stroke="#fff" strokeWidth="2" />
                  <g transform={`translate(${tx} ${ty}) rotate(${i * SLICE + SLICE / 2})`}>
                    <text textAnchor="middle" y="-4" fontSize="26">
                      {s.emoji}
                    </text>
                    <text textAnchor="middle" y="18" fontSize="12" fontWeight="700" fill="#fff" style={{ letterSpacing: "0.04em" }}>
                      {s.label.toUpperCase()}
                    </text>
                  </g>
                </g>
              );
            })}
            <circle cx={R} cy={R} r="30" fill="#fff" />
            <circle cx={R} cy={R} r="22" fill="#15201c" />
          </svg>
        </motion.div>
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          className="absolute left-1/2 top-1/2 z-10 flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold uppercase tracking-wide text-white transition hover:scale-105 disabled:opacity-80"
          aria-label="Spin the wheel"
        >
          Spin
        </button>
      </div>

      <div className="min-h-64">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key={result.text}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative rounded-3xl bg-surface p-6 shadow-lg"
              style={{ boxShadow: `0 0 0 3px ${result.seg.color}, var(--shadow-lg)` }}
            >
              {celebrate > 0 && <Confetti key={celebrate} />}
              <p className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: result.seg.color }}>
                {result.seg.emoji} {result.seg.label} challenge
              </p>
              <p className="mt-4 font-display text-2xl leading-snug text-ink">{result.text}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setDone((d) => d + 1);
                    setCelebrate((c) => c + 1);
                  }}
                >
                  <Check /> I did it!
                </Button>
                <Button variant="secondary" onClick={spin} disabled={spinning}>
                  <RefreshCw /> Spin again
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl border border-dashed border-line-strong bg-surface/70 p-6">
              <p className="text-4xl">{spinning ? "🌀" : "🎡"}</p>
              <p className="mt-3 font-display text-2xl text-ink">{spinning ? "Spinning…" : "Feeling stuck? Let the wheel pick."}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                Every slice is a tiny challenge that takes a minute or two: move, laugh, notice, be kind. Perfect for a study break.
              </p>
              {!spinning && (
                <Button size="lg" className="mt-5 rounded-full" onClick={spin}>
                  <Sparkles /> Spin the wheel
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-4 text-sm text-ink-3">
          Challenges completed on this device: <span className="font-semibold text-ink">{done}</span>
        </p>
      </div>
    </div>
  );
}
