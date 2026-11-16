"use client";

import { Bath, ChevronLeft, ChevronRight, Droplets, Drumstick, Ellipsis, Gamepad2, Heart, MessageCircleHeart, Mic, Moon, Music2, Palette, Shirt, ShieldPlus, Utensils, Volume2, VolumeX, Zap } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { friendLevel, ROOM_BY_ID } from "./catalog";
import { SPECIES } from "./species";
import type { Panel, RoomId, SpeciesId, StatKey, Stats } from "./types";

export const glass = "bg-white/80 backdrop-blur-md ring-1 ring-black/5 shadow-md";

const METERS: { key: StatKey; label: string; icon: typeof Heart; color: string; low: string }[] = [
  { key: "hunger", label: "Food", icon: Drumstick, color: "#f2b437", low: "Hungry" },
  { key: "happiness", label: "Joy", icon: Heart, color: "#e86a9a", low: "Wants fun" },
  { key: "energy", label: "Energy", icon: Zap, color: "#4b9fe1", low: "Sleepy" },
  { key: "cleanliness", label: "Clean", icon: Droplets, color: "#34b892", low: "Needs a bath" },
  { key: "health", label: "Health", icon: ShieldPlus, color: "#8b68d6", low: "Needs care" },
];

function word(v: number) {
  return v >= 80 ? "great" : v >= 55 ? "good" : v >= 30 ? "okay" : "low";
}

/** Five stat meters. Compact row on phones, a tidy column on larger screens. */
export function StatMeters({ stats }: { stats: Stats }) {
  return (
    <div className={cn("pointer-events-auto rounded-2xl p-1.5 sm:w-[184px] sm:rounded-3xl sm:p-2.5", glass)} role="group" aria-label="Pet stats">
      <ul className="grid grid-cols-5 gap-1 sm:grid-cols-1 sm:gap-1.5">
        {METERS.map((m) => {
          const v = Math.round(stats[m.key]);
          const low = v < 30;
          const Icon = m.icon;
          return (
            <li
              key={m.key}
              className="flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:gap-2"
              role="meter"
              aria-label={m.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-valuetext={`${m.label}: ${v} out of 100, ${low ? m.low.toLowerCase() : word(v)}`}
              title={`${m.label}: ${v}/100`}
            >
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full sm:size-7", low && "animate-pulse")} style={{ background: `${m.color}22`, color: m.color }}>
                <Icon className="size-3.5 sm:size-4" aria-hidden />
              </span>
              <div className="w-full min-w-0 flex-1">
                <div className="hidden items-baseline justify-between text-[11px] font-semibold text-ink-2 sm:flex">
                  <span>{m.label}</span>
                  <span className="tabular-nums text-ink">{v}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] sm:mt-0.5 sm:h-2">
                  <motion.div className="h-full rounded-full" style={{ background: m.color }} initial={false} animate={{ width: `${Math.max(4, v)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
                </div>
                <p className="mt-0.5 text-center text-[10px] font-semibold tabular-nums text-ink-2 sm:hidden">{v}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function NameChip({ name, species, friendship, onOpen }: { name: string; species: SpeciesId; friendship: number; onOpen: () => void }) {
  const lvl = friendLevel(friendship);
  const pct = Math.min(100, ((friendship - lvl.from) / Math.max(1, lvl.next - lvl.from)) * 100);
  return (
    <button type="button" onClick={onOpen} className={cn("pointer-events-auto flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-left transition hover:bg-white", glass)} aria-label={`${name}, friendship level ${lvl.name}. Open pet menu`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sun-soft text-lg" aria-hidden>
        {SPECIES[species].emoji}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] leading-tight text-ink">{name}</span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-rose">
          <Heart className="size-2.5 fill-current" aria-hidden />
          <span className="truncate">{lvl.name}</span>
          <span className="ml-0.5 hidden h-1 w-10 overflow-hidden rounded-full bg-rose-soft min-[380px]:block">
            <span className="block h-full rounded-full bg-rose" style={{ width: `${pct}%` }} />
          </span>
        </span>
      </span>
    </button>
  );
}

function RoundToggle({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn("pointer-events-auto relative flex size-9 items-center justify-center rounded-full transition", glass, on ? "text-primary" : "text-ink-3")}
    >
      {children}
      {!on && <span className="absolute h-[2px] w-5 rotate-45 rounded-full bg-current" aria-hidden />}
    </button>
  );
}

export function TopRight({ sfx, music, onSfx, onMusic, onMenu }: { sfx: boolean; music: boolean; onSfx: () => void; onMusic: () => void; onMenu: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <RoundToggle on={sfx} label={sfx ? "Sound effects on" : "Sound effects off"} onClick={onSfx}>
        {sfx ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </RoundToggle>
      <RoundToggle on={music} label={music ? "Music on" : "Music off"} onClick={onMusic}>
        <Music2 className="size-4" />
      </RoundToggle>
      <button type="button" onClick={onMenu} aria-label="Pet menu and settings" title="Menu" className={cn("pointer-events-auto flex size-9 items-center justify-center rounded-full text-ink-2 transition hover:text-ink", glass)}>
        <Ellipsis className="size-4" />
      </button>
    </div>
  );
}

export function RoomNav({ room, onPrev, onNext, onOpen }: { room: RoomId; onPrev: () => void; onNext: () => void; onOpen: () => void }) {
  const r = ROOM_BY_ID[room];
  return (
    <div className={cn("pointer-events-auto flex items-center rounded-full p-0.5", glass)}>
      <button type="button" onClick={onPrev} aria-label="Previous room" className="flex size-7 items-center justify-center rounded-full text-ink-2 transition hover:bg-black/5 hover:text-ink">
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" onClick={onOpen} className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[13px] font-semibold text-ink transition hover:bg-black/5" aria-label={`${r.name}. Change room`}>
        <span aria-hidden>{r.emoji}</span>
        <span className="whitespace-nowrap">{r.name}</span>
      </button>
      <button type="button" onClick={onNext} aria-label="Next room" className="flex size-7 items-center justify-center rounded-full text-ink-2 transition hover:bg-black/5 hover:text-ink">
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export type ToolId = "feed" | "bath" | "play" | "sleep" | "dress" | "talk" | "chat" | "room";

const TOOLS: { id: ToolId; label: string; short: string; icon: typeof Heart; color: string }[] = [
  { id: "feed", label: "Feed", short: "Feed", icon: Utensils, color: "#f2b437" },
  { id: "bath", label: "Bath", short: "Bath", icon: Bath, color: "#4b9fe1" },
  { id: "play", label: "Play", short: "Play", icon: Gamepad2, color: "#ef7d67" },
  { id: "sleep", label: "Sleep", short: "Sleep", icon: Moon, color: "#8b68d6" },
  { id: "dress", label: "Dress up", short: "Dress", icon: Shirt, color: "#e86a9a" },
  { id: "talk", label: "Talk", short: "Talk", icon: Mic, color: "#34b892" },
  { id: "chat", label: "Chat", short: "Chat", icon: MessageCircleHeart, color: "#2f7cc0" },
  { id: "room", label: "Customise room", short: "Room", icon: Palette, color: "#c46a32" },
];

export function Toolbar({ active, onPick, disabled }: { active: Panel | "bath" | "play" | "sleep" | "talk" | null; onPick: (id: ToolId) => void; disabled?: boolean }) {
  return (
    <nav aria-label="Pet actions" className={cn("pointer-events-auto rounded-[1.6rem] p-1.5", glass)}>
      <ul className="grid grid-cols-8 gap-0.5 sm:gap-1">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <li key={t.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(t.id)}
                disabled={disabled}
                aria-pressed={on}
                aria-label={t.label}
                className={cn("group flex w-full min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-1 transition sm:py-1.5", on ? "bg-white shadow-sm" : "hover:bg-white/70", "disabled:opacity-50")}
              >
                <span className="flex size-8 items-center justify-center rounded-full transition group-hover:scale-110 group-active:scale-95 sm:size-10" style={{ background: on ? t.color : `${t.color}24`, color: on ? "#fff" : t.color }}>
                  <Icon className="size-4 sm:size-[18px]" aria-hidden />
                </span>
                <span className="w-full truncate text-center text-[10px] font-semibold leading-tight text-ink-2 sm:text-[11px]">
                  <span className="sm:hidden">{t.short}</span>
                  <span className="hidden sm:inline">{t.id === "room" ? "Room" : t.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
