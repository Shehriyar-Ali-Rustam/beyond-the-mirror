"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Brush, Check, Droplets, Mic, MicOff, ShowerHead, SprayCan, Sun, Wind, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { audio } from "./audio";
import { glass } from "./hud";
import type { BathTool } from "./types";
import type { World } from "./world";

const now = () => performance.now();

function Bar({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  return (
    <motion.div
      role="region"
      aria-label={label}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn("pointer-events-auto rounded-[1.6rem] p-2 sm:p-2.5", glass, className)}
    >
      {children}
    </motion.div>
  );
}

function CloseBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-2 transition hover:bg-black/10 hover:text-ink">
      <X className="size-4" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Bath
// ---------------------------------------------------------------------------

export function BathBar({ world, name, fish, onDone }: { world: React.RefObject<World | null>; name: string; fish: boolean; onDone: (score: { soap: boolean; rinse: boolean; dry: boolean; brush: boolean }) => void }) {
  const [tool, setTool] = useState<BathTool | null>(null);
  const [shower, setShower] = useState(false);
  const [score, setScore] = useState({ soap: false, rinse: false, dry: false, brush: false });
  useEffect(() => {
    const t = setInterval(() => {
      const w = world.current;
      if (!w) return;
      const s = w.bathScore();
      setScore((prev) => (prev.soap === s.soap && prev.rinse === s.rinse && prev.dry === s.dry && prev.brush === s.brush ? prev : s));
      setShower(w.bath.shower);
    }, 250);
    return () => clearInterval(t);
  }, [world]);
  const pick = (t: BathTool) => {
    const w = world.current;
    if (!w) return;
    if (t === "shower") {
      w.setTool("shower");
      setShower(w.bath.shower);
      setTool("shower");
      return;
    }
    const next = tool === t ? null : t;
    w.setTool(next);
    setTool(next);
    setShower(false);
  };
  const tools: { id: BathTool; label: string; icon: typeof Brush; color: string }[] = fish
    ? [
        { id: "shampoo", label: "Sponge", icon: SprayCan, color: "#34b892" },
        { id: "shower", label: shower ? "Water off" : "Fresh water", icon: Droplets, color: "#4b9fe1" },
        { id: "brush", label: "Polish", icon: Sun, color: "#f2b437" },
      ]
    : [
        { id: "shampoo", label: "Shampoo", icon: SprayCan, color: "#e86a9a" },
        { id: "shower", label: shower ? "Shower off" : "Shower", icon: ShowerHead, color: "#4b9fe1" },
        { id: "towel", label: "Towel", icon: Droplets, color: "#ef7d67" },
        { id: "dryer", label: "Dryer", icon: Wind, color: "#8b68d6" },
        { id: "brush", label: "Brush", icon: Brush, color: "#c46a32" },
      ];
  const steps = fish
    ? [
        { k: "soap", label: "Scrub" },
        { k: "rinse", label: "Fresh water" },
        { k: "brush", label: "Polish" },
      ]
    : [
        { k: "soap", label: "Lather" },
        { k: "rinse", label: "Rinse" },
        { k: "dry", label: "Dry" },
        { k: "brush", label: "Brush" },
      ];
  const hint = fish
    ? tool === "shampoo"
      ? "Rub the glass to scrub off the green bits."
      : tool === "brush"
        ? "Rub the glass until it sparkles."
        : shower
          ? "Fresh bubbly water is flowing in."
          : `Pick a tool to clean ${name}'s tank.`
    : tool === "shampoo"
      ? `Rub ${name} all over to make bubbles.`
      : tool === "shower"
        ? shower
          ? "Rinse until every bubble is gone, then turn it off."
          : "Turn the shower on to rinse."
        : tool === "towel"
          ? `Rub ${name} with the towel to dry off.`
          : tool === "dryer"
            ? `Press and hold on ${name} to blow-dry.`
            : tool === "brush"
              ? `Brush ${name} for extra fluff.`
              : `Pick a tool. Start with shampoo!`;
  const done = steps.every((s) => score[s.k as keyof typeof score]);
  return (
    <Bar label="Bath time tools">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ol className="mb-1.5 flex flex-wrap items-center gap-1" aria-label="Bath steps">
            {steps.map((s, i) => {
              const ok = score[s.k as keyof typeof score];
              return (
                <li key={s.k} className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", ok ? "bg-mint-soft text-ok" : "bg-black/5 text-ink-3")}>
                  {ok ? <Check className="size-3" aria-hidden /> : <span aria-hidden>{i + 1}</span>}
                  {s.label}
                  <span className="sr-only">{ok ? "done" : "to do"}</span>
                </li>
              );
            })}
          </ol>
          <p className="truncate text-[12px] text-ink-2" aria-live="polite">
            {hint}
          </p>
        </div>
        <Button size="sm" variant={done ? "primary" : "secondary"} className="rounded-full" onClick={() => onDone(score)}>
          {done ? "All clean!" : "Done"}
        </Button>
      </div>
      <div className={cn("mt-2 grid gap-1", fish ? "grid-cols-3" : "grid-cols-5")}>
        {tools.map((t) => {
          const Icon = t.icon;
          const on = t.id === "shower" ? shower : tool === t.id;
          return (
            <button key={t.id} type="button" aria-pressed={on} onClick={() => pick(t.id)} className={cn("flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition sm:text-[11px]", on ? "bg-white shadow-sm" : "hover:bg-white/70")}>
              <span className="flex size-9 items-center justify-center rounded-full" style={{ background: on ? t.color : `${t.color}24`, color: on ? "#fff" : t.color }}>
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="truncate text-ink-2">{t.label}</span>
            </button>
          );
        })}
      </div>
    </Bar>
  );
}

// ---------------------------------------------------------------------------
// Play
// ---------------------------------------------------------------------------

export function PlayBar({ mode, fish, name, onPick, onClose }: { mode: "ball" | "yarn" | "hide" | null; fish: boolean; name: string; onPick: (m: "ball" | "yarn" | "hide") => void; onClose: () => void }) {
  const toys = [
    { id: "ball" as const, label: fish ? "Floaty ball" : "Ball", emoji: "🎾" },
    { id: "yarn" as const, label: fish ? "Follow me" : "Yarn", emoji: fish ? "🫧" : "🧶" },
    { id: "hide" as const, label: "Hide and seek", emoji: "🙈" },
  ];
  const hint =
    mode === "ball"
      ? fish
        ? `Tap the tank to drop the ball in. ${name} will bump it!`
        : `Tap anywhere on the floor to throw. ${name} brings it back!`
      : mode === "yarn"
        ? fish
          ? `Move your finger over the tank and ${name} will follow.`
          : `Tap the floor to roll the yarn and watch ${name} pounce.`
        : mode === "hide"
          ? `Tap the spot where you think ${name} is hiding.`
          : `Pick a game to play with ${name}.`;
  return (
    <Bar label="Play time">
      <div className="flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
          {toys.map((t) => (
            <button key={t.id} type="button" aria-pressed={mode === t.id} onClick={() => onPick(t.id)} className={cn("flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition", mode === t.id ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:bg-white/70")}>
              <span className="text-xl leading-none" aria-hidden>
                {t.emoji}
              </span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>
        <CloseBtn onClick={onClose} label="Stop playing" />
      </div>
      <p className="mt-1 truncate px-1 text-center text-[12px] text-ink-2" aria-live="polite">
        {hint}
      </p>
    </Bar>
  );
}

// ---------------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------------

export function SleepBar({ name, energy, asleep, onWake, onClose }: { name: string; energy: number; asleep: boolean; onWake: () => void; onClose: () => void }) {
  return (
    <Bar label="Sleep time">
      <div className="flex items-center gap-3 px-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-grape-soft text-xl" aria-hidden>
          🌙
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{asleep ? `Shh, ${name} is fast asleep` : `${name} is getting cosy...`}</p>
          <p className="text-[12px] text-ink-2">
            Energy {Math.round(energy)}%{energy >= 99 ? ", fully charged!" : ". Sleeping fills it up."}
          </p>
        </div>
        <Button size="sm" variant="secondary" className="rounded-full" onClick={asleep ? onWake : onClose}>
          {asleep ? "Wake up" : "Never mind"}
        </Button>
      </div>
    </Bar>
  );
}

// ---------------------------------------------------------------------------
// Talk: hold to record, the pet repeats it in a funny voice
// ---------------------------------------------------------------------------

type TalkState = "idle" | "starting" | "rec" | "play";

const MIC_ERRORS: Record<string, (n: string) => string> = {
  denied: (n) => `Microphone access is blocked. You can allow it in your browser's site settings and try again. Or chat with ${n} by text instead!`,
  unsupported: (n) => `This browser can't record audio here. Try the Chat button instead, ${n} loves a good chat.`,
  nomic: () => `We couldn't find a microphone. Plug one in, or try Chat instead.`,
  quiet: (n) => `${n} didn't quite hear that. Try speaking a bit louder and closer.`,
  error: () => `Something went wrong with the recording. Please try again.`,
};

export function TalkBar({ world, name, rate, onTalked, onClose }: { world: React.RefObject<World | null>; name: string; rate: number; onTalked: () => void; onClose: () => void }) {
  const [state, setState] = useState<TalkState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const signal = useRef<{ stop?: () => void; cancelled?: boolean }>({});
  const pressAt = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const w = world.current;
    const sig = signal;
    return () => {
      alive.current = false;
      sig.current.stop?.();
      w?.listen(false);
    };
  }, [world]);

  useEffect(() => {
    if (state !== "rec") return;
    let raf = 0;
    const loop = () => {
      setLevel(audio.micLevel());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  const start = async () => {
    if (state !== "idle") return;
    setError(null);
    signal.current = {};
    pressAt.current = now();
    setState("starting");
    world.current?.listen(true);
    const p = audio.record(4000, signal.current);
    // The recorder is live once permission is granted.
    const t = setTimeout(() => alive.current && setState((s) => (s === "starting" ? "rec" : s)), 350);
    const res = await p;
    clearTimeout(t);
    if (!alive.current) return;
    setLevel(0);
    world.current?.listen(false);
    if (!res.ok) {
      setState("idle");
      setError(MIC_ERRORS[res.reason](name));
      return;
    }
    setState("play");
    world.current?.speak(true);
    await audio.playVoice(res.buffer, rate);
    if (!alive.current) return;
    world.current?.speak(false);
    setState("idle");
    onTalked();
  };

  const stop = () => {
    if (state !== "rec" && state !== "starting") return;
    if (signal.current.stop) signal.current.stop();
    else signal.current.cancelled = true;
  };

  const label = state === "play" ? `${name} is talking!` : state === "rec" || state === "starting" ? "Listening... let go when you're done" : "Hold to talk";
  return (
    <Bar label="Talk to your pet">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={state === "rec" ? "Stop recording" : `Hold to talk to ${name}`}
          aria-pressed={state === "rec"}
          disabled={state === "play"}
          onPointerDown={(e) => {
            e.preventDefault();
            if (state === "idle") void start();
            else if (state === "rec") stop();
          }}
          onPointerUp={() => {
            if (now() - pressAt.current > 450) stop();
          }}
          onKeyDown={(e) => {
            if (e.key !== " " && e.key !== "Enter") return;
            e.preventDefault();
            if (state === "idle") void start();
            else stop();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={cn("relative flex size-16 shrink-0 select-none items-center justify-center rounded-full text-white shadow-md transition active:scale-95 disabled:opacity-80", state === "rec" || state === "starting" ? "bg-coral" : state === "play" ? "bg-grape" : "bg-mint")}
          style={{ touchAction: "none" }}
        >
          {(state === "rec" || state === "starting") && <span className="absolute inset-0 rounded-full bg-coral/40" style={{ transform: `scale(${1.1 + level * 0.6})`, transition: "transform 80ms linear" }} aria-hidden />}
          {state === "play" ? <span className="relative text-2xl" aria-hidden>🗣️</span> : error ? <MicOff className="relative size-7" aria-hidden /> : <Mic className="relative size-7" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink" aria-live="polite">
            {label}
          </p>
          {state === "rec" || state === "starting" ? (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-coral" style={{ animation: "pet-countdown 4s linear forwards" }} />
            </div>
          ) : error ? (
            <p className="mt-0.5 text-[12px] leading-snug text-danger" role="alert">
              {error}
            </p>
          ) : (
            <p className="mt-0.5 text-[12px] leading-snug text-ink-2">Say something (up to 4 seconds) and {name} will say it back in a funny voice. Nothing is saved or sent anywhere.</p>
          )}
        </div>
        <CloseBtn onClick={onClose} label="Close talk" />
      </div>
      <style>{`@keyframes pet-countdown{from{width:100%}to{width:0%}}`}</style>
    </Bar>
  );
}
