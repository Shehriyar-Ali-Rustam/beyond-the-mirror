"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Lock, Moon, MoonStar, Pencil, RotateCcw, Sun, Sunset, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCESSORIES, FLOORS, FRIEND_LEVELS, ROOMS, WALLPAPERS, fitsSpecies, foodsFor, friendLevel } from "./catalog";
import { SPECIES } from "./species";
import type { Decor, FoodId, LightingChoice, Pattern, Pet, PetLook, RoomId, SaveData, Slot } from "./types";

// ---------------------------------------------------------------------------
// Sheet: side panel on larger screens, bottom sheet on phones
// ---------------------------------------------------------------------------

export function Sheet({ title, subtitle, onClose, children, className }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn(
        "pointer-events-auto absolute inset-x-2 bottom-[84px] z-30 flex max-h-[56%] flex-col overflow-hidden rounded-3xl bg-white/92 shadow-lg ring-1 ring-black/5 backdrop-blur-md outline-none",
        "sm:inset-x-auto sm:bottom-[96px] sm:right-3 sm:top-3 sm:max-h-none sm:w-[340px]",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-3.5">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-2">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-2 transition hover:bg-black/10 hover:text-ink">
          <X className="size-4" />
        </button>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </motion.section>
  );
}

// ---------------------------------------------------------------------------
// Feeding
// ---------------------------------------------------------------------------

export function FeedPanel({ pet, hunger, onFeed, onClose }: { pet: Pet; hunger: number; onFeed: (f: FoodId) => void; onClose: () => void }) {
  const fish = pet.species === "goldfish";
  const foods = foodsFor(pet.species);
  return (
    <Sheet title={fish ? "Fish food" : "The fridge"} subtitle={fish ? `Sprinkle something in and watch ${pet.name} swim up.` : `Pick a snack. ${pet.name} will run to the bowl.`} onClose={onClose}>
      {hunger >= 96 && <p className="mb-3 rounded-2xl bg-mint-soft px-3 py-2 text-xs font-medium text-ink">{pet.name} is nicely full right now. Water is always welcome!</p>}
      <ul className="grid grid-cols-3 gap-2">
        {foods.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onFeed(f.id)}
              className="flex w-full flex-col items-center gap-1 rounded-2xl bg-white px-1 py-2.5 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md active:scale-95"
            >
              <span className="text-[26px] leading-none" aria-hidden>
                {f.emoji}
              </span>
              <span className="text-[11px] font-semibold leading-tight text-ink">{f.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-ink-3">Every pet has favourites, and a few things they&apos;d rather not eat. Try different foods to find out.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Dress up
// ---------------------------------------------------------------------------

const PATTERN_NAMES: Record<Pattern, string> = { solid: "Plain", spots: "Spots", patches: "Patches", stripes: "Stripes", socks: "Socks" };
const SLOT_NAMES: Record<Slot, string> = { head: "Hats and bows", face: "Glasses", neck: "Neck", body: "Outfits" };

function Swatch({ color, on, onClick, label }: { color: string; on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      className={cn("relative size-8 rounded-full shadow-sm ring-2 transition hover:scale-110", on ? "ring-primary ring-offset-2" : "ring-white")}
      style={{ background: color }}
    >
      {on && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" aria-hidden />}
    </button>
  );
}

export function DressPanel({ pet, unlocked, friendship, onLook, onAcc, onClose }: { pet: Pet; unlocked: string[]; friendship: number; onLook: (l: PetLook) => void; onAcc: (slot: Slot, id: string | null) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"colours" | "wear">("wear");
  const spec = SPECIES[pet.species];
  const look = pet.look;
  return (
    <Sheet title="Dress up" subtitle={`Make ${pet.name} look fabulous.`} onClose={onClose}>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-black/5 p-1" role="tablist" aria-label="Dress up sections">
        {(["wear", "colours"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-full py-1.5 text-xs font-semibold transition", tab === t ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>
            {t === "wear" ? "Accessories" : "Colours"}
          </button>
        ))}
      </div>
      {tab === "colours" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-2">Main colour</p>
            <div className="flex flex-wrap gap-2">
              {spec.bodyColors.map((c) => (
                <Swatch key={c} color={c} on={look.body === c} onClick={() => onLook({ ...look, body: c })} label={`Main colour ${c}`} />
              ))}
              <label className="relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[conic-gradient(#ef6a55,#f2b437,#34b892,#4b9fe1,#8b68d6,#e86a9a,#ef6a55)] shadow-sm ring-2 ring-white" title="Pick any colour">
                <input type="color" value={look.body} onChange={(e) => onLook({ ...look, body: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick any main colour" />
              </label>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-2">{spec.accentLabel}</p>
            <div className="flex flex-wrap gap-2">
              {spec.accentColors.map((c) => (
                <Swatch key={c} color={c} on={look.accent === c} onClick={() => onLook({ ...look, accent: c })} label={`${spec.accentLabel} ${c}`} />
              ))}
              <label className="relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[conic-gradient(#ef6a55,#f2b437,#34b892,#4b9fe1,#8b68d6,#e86a9a,#ef6a55)] shadow-sm ring-2 ring-white" title="Pick any colour">
                <input type="color" value={look.accent} onChange={(e) => onLook({ ...look, accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`Pick any ${spec.accentLabel.toLowerCase()}`} />
              </label>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-ink-2">Pattern</p>
            <div className="flex flex-wrap gap-1.5">
              {spec.patterns.map((p) => (
                <button key={p} type="button" aria-pressed={look.pattern === p} onClick={() => onLook({ ...look, pattern: p })} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", look.pattern === p ? "bg-primary text-white" : "bg-black/5 text-ink-2 hover:bg-black/10")}>
                  {PATTERN_NAMES[p]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(["head", "face", "neck", "body"] as Slot[]).map((slot) => {
            const items = ACCESSORIES.filter((a) => a.slot === slot && fitsSpecies(a, pet.species));
            if (!items.length) return null;
            const current = pet.acc[slot];
            return (
              <div key={slot}>
                <p className="mb-2 text-xs font-semibold text-ink-2">{SLOT_NAMES[slot]}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <button type="button" aria-pressed={!current} onClick={() => onAcc(slot, null)} className={cn("flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-semibold transition", !current ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07]")}>
                    <X className="size-5" aria-hidden />
                    None
                  </button>
                  {items.map((a) => {
                    const open = unlocked.includes(a.id);
                    const on = current === a.id;
                    const need = FRIEND_LEVELS.slice().reverse().find((l) => l.at <= a.unlockAt)?.name ?? "";
                    return (
                      <button
                        key={a.id}
                        type="button"
                        disabled={!open}
                        aria-pressed={on}
                        aria-label={open ? a.name : `${a.name}, locked. Unlocks at ${a.unlockAt} friendship`}
                        title={open ? a.name : `Unlocks at ${a.unlockAt} friendship (${need})`}
                        onClick={() => onAcc(slot, on ? null : a.id)}
                        className={cn("relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold leading-tight transition", on ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07]", !open && "opacity-55")}
                      >
                        <span className="text-xl leading-none" aria-hidden>
                          {a.emoji}
                        </span>
                        <span className="line-clamp-2">{a.name}</span>
                        {!open && (
                          <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-white px-1 text-[9px] text-ink-3 shadow-sm">
                            <Lock className="size-2.5" aria-hidden />
                            {a.unlockAt}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] leading-relaxed text-ink-3">
            Locked items open up as your friendship grows (you&apos;re at {Math.floor(friendship)}). Feeding, bathing, playing and chatting all help.
          </p>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Rooms and decoration
// ---------------------------------------------------------------------------

const LIGHT_OPTS: { id: LightingChoice; label: string; icon: typeof Sun }[] = [
  { id: "auto", label: "Auto", icon: Sun },
  { id: "day", label: "Day", icon: Sun },
  { id: "evening", label: "Evening", icon: Sunset },
  { id: "night", label: "Night", icon: MoonStar },
];

export function RoomPanel({ room, decor, lighting, onRoom, onDecor, onLighting, onClose }: { room: RoomId; decor: Decor; lighting: LightingChoice; onRoom: (r: RoomId) => void; onDecor: (d: Decor) => void; onLighting: (l: LightingChoice) => void; onClose: () => void }) {
  const indoor = ROOMS.find((r) => r.id === room)?.indoor;
  return (
    <Sheet title="Rooms and style" subtitle="Visit another room or redecorate this one." onClose={onClose}>
      <div className="grid grid-cols-4 gap-1.5">
        {ROOMS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={room === r.id}
            onClick={() => onRoom(r.id)}
            className={cn("flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold leading-tight transition", room === r.id ? "bg-primary-soft text-primary ring-2 ring-primary" : "bg-black/[0.04] text-ink-2 hover:bg-black/[0.07]")}
          >
            <span className="text-xl leading-none" aria-hidden>
              {r.emoji}
            </span>
            {r.name}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs font-semibold text-ink-2">Lighting</p>
      <div className="grid grid-cols-4 gap-1 rounded-full bg-black/5 p-1" role="radiogroup" aria-label="Lighting">
        {LIGHT_OPTS.map((o) => {
          const Icon = o.id === "night" ? Moon : o.icon;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={lighting === o.id} onClick={() => onLighting(o.id)} className={cn("flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-semibold transition", lighting === o.id ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>
              {o.id !== "auto" && <Icon className="size-3" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
      {indoor ? (
        <>
          <p className="mb-2 mt-4 text-xs font-semibold text-ink-2">Wallpaper</p>
          <div className="grid grid-cols-5 gap-2">
            {WALLPAPERS.map((w) => (
              <button key={w.id} type="button" aria-pressed={decor.wall === w.id} aria-label={`Wallpaper: ${w.name}`} title={w.name} onClick={() => onDecor({ ...decor, wall: w.id })} className={cn("aspect-square rounded-xl shadow-sm ring-2 transition hover:scale-105", decor.wall === w.id ? "ring-primary ring-offset-2" : "ring-white")} style={{ background: w.swatch }} />
            ))}
          </div>
          <p className="mb-2 mt-4 text-xs font-semibold text-ink-2">Floor</p>
          <div className="grid grid-cols-5 gap-2">
            {FLOORS.map((f) => (
              <button key={f.id} type="button" aria-pressed={decor.floor === f.id} aria-label={`Floor: ${f.name}`} title={f.name} onClick={() => onDecor({ ...decor, floor: f.id })} className={cn("aspect-square rounded-xl shadow-sm ring-2 transition hover:scale-105", decor.floor === f.id ? "ring-primary ring-offset-2" : "ring-white")} style={{ background: f.swatch }} />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-mint-soft px-3 py-2 text-xs text-ink-2">Outdoor places can&apos;t be redecorated, but the lighting works everywhere. Try the forest at night!</p>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Menu: rename, progress, start over, help
// ---------------------------------------------------------------------------

export function MenuPanel({ save, signedIn, onRename, onStartOver, onClose }: { save: SaveData; signedIn: boolean; onRename: (n: string) => void; onStartOver: () => void; onClose: () => void }) {
  const pet = save.pet!;
  const [name, setName] = useState(pet.name);
  const [confirm, setConfirm] = useState(false);
  const lvl = friendLevel(save.friendship);
  const nextItem = ACCESSORIES.filter((a) => !save.unlocked.includes(a.id) && fitsSpecies(a, pet.species)).sort((a, b) => a.unlockAt - b.unlockAt)[0];
  const c = save.counts;
  return (
    <Sheet title={pet.name} subtitle={`${SPECIES[pet.species].name} · ${lvl.name}`} onClose={onClose}>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = name.trim().slice(0, 20);
          if (n) onRename(n);
        }}
      >
        <label className="sr-only" htmlFor="pet-rename">
          Pet name
        </label>
        <input id="pet-rename" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-primary" />
        <Button size="sm" type="submit" variant="soft" disabled={!name.trim() || name.trim() === pet.name}>
          <Pencil /> Rename
        </Button>
      </form>
      <div className="mt-4 rounded-2xl bg-rose-soft p-3">
        <p className="text-xs font-semibold text-ink">Friendship: {Math.floor(save.friendship)} / 100</p>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-rose" style={{ width: `${save.friendship}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-2">{nextItem ? `Next unlock: ${nextItem.emoji} ${nextItem.name} at ${nextItem.unlockAt}.` : "You've unlocked everything. Amazing!"}</p>
      </div>
      <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
        {[
          ["Meals", c.meals],
          ["Baths", c.baths],
          ["Games", c.plays],
          ["Cuddles", c.pets],
          ["Talks", c.talks],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-black/[0.04] py-1.5">
            <dt className="text-[10px] text-ink-3">{k}</dt>
            <dd className="font-display text-base text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 space-y-1.5 text-xs leading-relaxed text-ink-2">
        <p className="font-semibold text-ink">How to play</p>
        <p>Tap different parts of {pet.name}: head, ears, belly, paws, tail and back all get a different reaction. Tap the floor to call them over.</p>
        <p>Stats go down slowly over time, even while you&apos;re away, but never too far. A quick visit keeps everyone happy.</p>
        <p>{signedIn ? "Your pet is saved to your account." : "Your pet is saved on this device. Sign in to keep it everywhere."}</p>
      </div>
      <div className="mt-4 border-t border-line pt-3">
        {confirm ? (
          <div className="rounded-2xl bg-coral-soft p-3">
            <p className="text-xs text-ink">This replaces {pet.name} with a brand new pet. Are you sure?</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={onStartOver}>
                Yes, start over
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                Keep {pet.name}
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
            <RotateCcw /> Start over with a new pet
          </Button>
        )}
      </div>
    </Sheet>
  );
}
