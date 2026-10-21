"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TalkCta } from "./shared";

/* ------------------------------------------------------------------ breathe */
const PATTERNS = {
  calm: { name: "Calm (4 · 2 · 6)", phases: [["Breathe in", 4], ["Hold", 2], ["Breathe out", 6]] },
  box: { name: "Box (4 · 4 · 4 · 4)", phases: [["Breathe in", 4], ["Hold", 4], ["Breathe out", 4], ["Hold", 4]] },
} as const;

export function Breathing({ compact }: { compact?: boolean }) {
  const [pattern, setPattern] = useState<keyof typeof PATTERNS>("calm");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const [cycles, setCycles] = useState(0);
  const phases = PATTERNS[pattern].phases;
  const [label, seconds] = phases[phase];

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setCount((c) => {
        if (c + 1 < seconds) return c + 1;
        setPhase((p) => {
          const next = (p + 1) % phases.length;
          if (next === 0) setCycles((n) => n + 1);
          return next;
        });
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, seconds, phases.length]);

  const scale = !running ? 0.75 : label === "Breathe in" ? 1 : label === "Breathe out" ? 0.6 : undefined;

  return (
    <div className={cn("flex flex-col items-center", compact ? "py-4" : "py-8")}>
      {!compact && (
        <div className="mb-6 flex gap-2">
          {(Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).map((k) => (
            <button
              key={k}
              onClick={() => {
                setPattern(k);
                setPhase(0);
                setCount(0);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                pattern === k ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line text-ink-3 hover:text-ink",
              )}
            >
              {PATTERNS[k].name}
            </button>
          ))}
        </div>
      )}
      <div className="relative flex size-64 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={scale !== undefined ? { scale } : {}}
          transition={{ duration: running ? seconds : 0.6, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-8 rounded-full border border-primary/30 bg-primary/15"
          animate={scale !== undefined ? { scale } : {}}
          transition={{ duration: running ? seconds : 0.6, ease: "easeInOut", delay: 0.05 }}
        />
        <div className="relative text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={running ? `${label}-${phase}` : "idle"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="font-display text-2xl text-ink"
            >
              {running ? label : "Ready when you are"}
            </motion.p>
          </AnimatePresence>
          {running && <p className="mt-1 text-sm tabular-nums text-ink-3">{seconds - count}</p>}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => setRunning((r) => !r)} variant={running ? "secondary" : "primary"}>
          {running ? <Pause /> : <Play />}
          {running ? "Pause" : "Start breathing"}
        </Button>
      </div>
      <p className="mt-3 h-5 text-sm text-ink-3" aria-live="polite">
        {cycles > 0 && `${cycles} ${cycles === 1 ? "breath" : "breaths"}, ${cycles >= 5 ? "notice how your body feels now." : "keep going."}`}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- ambient */
function useBrownNoise() {
  const ctx = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);

  const toggle = async () => {
    if (on) {
      await ctx.current?.close();
      ctx.current = null;
      setOn(false);
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    const buffer = ac.createBuffer(1, ac.sampleRate * 4, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ac.currentTime + 2);
    src.connect(filter).connect(gain).connect(ac.destination);
    src.start();
    ctx.current = ac;
    setOn(true);
  };

  useEffect(() => () => void ctx.current?.close(), []);
  return { on, toggle };
}

/* ------------------------------------------------------------------ ground */
const SENSES = [
  { n: 5, verb: "see", hint: "Look around slowly. A colour, a shadow, something you've never noticed." },
  { n: 4, verb: "feel", hint: "Your feet on the floor, your sleeves, the air on your skin." },
  { n: 3, verb: "hear", hint: "Near and far. A fan, traffic, your own breathing." },
  { n: 2, verb: "smell", hint: "Or two smells you like, if nothing's around." },
  { n: 1, verb: "taste", hint: "Or one thing you're grateful for right now." },
];

function Grounding() {
  const [i, setI] = useState(0);
  const done = i >= SENSES.length;
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="mb-8 flex justify-center gap-2">
        {SENSES.map((s, j) => (
          <span key={s.n} className={cn("h-1.5 w-10 rounded-full transition-colors", j < i ? "bg-primary" : j === i ? "bg-primary/40" : "bg-line")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="text-center">
            <p className="font-display text-6xl text-primary">{SENSES[i].n}</p>
            <p className="mt-3 font-display text-2xl text-ink">things you can {SENSES[i].verb}</p>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">{SENSES[i].hint}</p>
            <p className="mt-2 text-sm text-ink-3">Name them in your head, or out loud. Take your time.</p>
            <Button className="mt-8" onClick={() => setI(i + 1)}>
              {i < SENSES.length - 1 ? "Done, next" : "Finish"}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
              <Check className="size-6" />
            </span>
            <p className="mt-4 font-display text-2xl text-ink">You&apos;re here. You&apos;re okay right now.</p>
            <p className="mt-2 text-[15px] text-ink-2">Grounding brings your attention back to the present when your mind is racing ahead.</p>
            <Button variant="secondary" className="mt-6" onClick={() => setI(0)}>
              Do it again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- next steps */
const GENTLE_STEPS = [
  "Drink a glass of water",
  "Eat something, even something small",
  "Step outside or open a window for two minutes",
  "Wash your face or have a shower",
  "Put on one song you love",
  "Message one person, even just “hey”",
  "Write down the one thing worrying you most",
  "Let tonight's to-do list be just one item",
  "Go to bed 30 minutes earlier",
];

function NextSteps() {
  const [done, setDone] = useState<string[]>([]);
  return (
    <div className="py-4">
      <p className="mb-5 text-[15px] leading-relaxed text-ink-2">
        You don&apos;t have to fix the whole day. Pick one or two of these. Small things still count.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {GENTLE_STEPS.map((s) => {
          const on = done.includes(s);
          return (
            <li key={s}>
              <button
                onClick={() => setDone((d) => (on ? d.filter((x) => x !== s) : [...d, s]))}
                aria-pressed={on}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
                  on ? "border-ok/40 bg-ok-soft text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong",
                )}
              >
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border transition", on ? "border-ok bg-ok text-white" : "border-line-strong")}>
                  {on && <Check className="size-3.5" />}
                </span>
                <span className={cn(on && "line-through decoration-ok/40")}>{s}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && <p className="mt-4 text-sm text-ok">That&apos;s {done.length} kind thing{done.length > 1 ? "s" : ""} for yourself today.</p>}
    </div>
  );
}

export function ResetTool() {
  const [tab, setTab] = useState<"breathe" | "ground" | "steps">("breathe");
  const noise = useBrownNoise();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "breathe", label: "Breathe" },
            { value: "ground", label: "Ground (5-4-3-2-1)" },
            { value: "steps", label: "Gentle next steps" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={noise.toggle} aria-pressed={noise.on}>
          {noise.on ? <Volume2 /> : <VolumeX />} {noise.on ? "Soft sound on" : "Soft background sound"}
        </Button>
      </div>
      <div className="rounded-3xl border border-line bg-surface px-5 sm:px-8">
        {tab === "breathe" && <Breathing />}
        {tab === "ground" && <Grounding />}
        {tab === "steps" && <NextSteps />}
      </div>
      <TalkCta
        title="If today is more than a bad day"
        body="If you feel like this most days, or you're thinking about hurting yourself, please tell your counselor or a trusted adult today."
        category="wellbeing"
      />
    </div>
  );
}
