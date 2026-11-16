import { z } from "zod";
import { ACCESSORY_BY_ID, DEFAULT_UNLOCKED, FLOORS, WALLPAPERS } from "./catalog";
import { SPECIES } from "./species";
import { LIGHTINGS, PATTERNS, ROOM_IDS, SPECIES_IDS, type RoomId, type SaveData, type Stats } from "./types";

export const SAVE_VERSION = 1 as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const stat = z.number().finite().transform((n) => Math.max(0, Math.min(100, n)));
const wallIds = WALLPAPERS.map((w) => w.id);
const floorIds = FLOORS.map((f) => f.id);

export const DEFAULT_STATS: Stats = { hunger: 80, happiness: 85, energy: 85, cleanliness: 90, health: 95 };

const accSchema = z
  .record(z.string(), z.string())
  .transform((rec) => {
    const out: Record<string, string> = {};
    for (const [slot, id] of Object.entries(rec)) {
      const item = ACCESSORY_BY_ID[id];
      if (item && item.slot === slot) out[slot] = id;
    }
    return out;
  })
  .catch({});

const petSchema = z.object({
  name: z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 20))
    .refine((s) => s.length > 0),
  species: z.enum(SPECIES_IDS),
  look: z.object({
    body: hex,
    accent: hex,
    pattern: z.enum(PATTERNS).catch("solid"),
  }),
  acc: accSchema,
  adoptedAt: z.number().finite().catch(0),
});

const decorSchema = z.object({
  wall: z.string().refine((s) => wallIds.includes(s)),
  floor: z.string().refine((s) => floorIds.includes(s)),
});

const saveSchema = z.object({
  version: z.number().catch(SAVE_VERSION),
  pet: petSchema.nullable().catch(null),
  stats: z
    .object({ hunger: stat, happiness: stat, energy: stat, cleanliness: stat, health: stat })
    .catch(DEFAULT_STATS),
  friendship: stat.catch(0),
  savedAt: z.number().finite().catch(0),
  room: z.enum(ROOM_IDS).catch("living"),
  decor: z
    .record(z.string(), z.unknown())
    .transform((rec) => {
      const out: Partial<Record<RoomId, { wall: string; floor: string }>> = {};
      for (const [room, value] of Object.entries(rec)) {
        const parsed = decorSchema.safeParse(value);
        if (parsed.success && (ROOM_IDS as readonly string[]).includes(room)) out[room as RoomId] = parsed.data;
      }
      return out;
    })
    .catch({}),
  lighting: z.enum(LIGHTINGS).catch("auto"),
  unlocked: z
    .array(z.string())
    .transform((list) => Array.from(new Set([...DEFAULT_UNLOCKED, ...list.filter((id) => id in ACCESSORY_BY_ID)])))
    .catch(DEFAULT_UNLOCKED),
  sound: z.object({ sfx: z.boolean().catch(true), music: z.boolean().catch(false) }).catch({ sfx: true, music: false }),
  counts: z
    .object({
      meals: z.number().int().nonnegative().catch(0),
      baths: z.number().int().nonnegative().catch(0),
      plays: z.number().int().nonnegative().catch(0),
      pets: z.number().int().nonnegative().catch(0),
      talks: z.number().int().nonnegative().catch(0),
    })
    .catch({ meals: 0, baths: 0, plays: 0, pets: 0, talks: 0 }),
});

export function defaultSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    pet: null,
    stats: { ...DEFAULT_STATS },
    friendship: 0,
    savedAt: now,
    room: "living",
    decor: {},
    lighting: "auto",
    unlocked: [...DEFAULT_UNLOCKED],
    sound: { sfx: true, music: false },
    counts: { meals: 0, baths: 0, plays: 0, pets: 0, talks: 0 },
  };
}

/** Validates untrusted save JSON. Anything broken falls back to a default. */
export function parseSave(raw: unknown, now: number): SaveData {
  if (raw == null || typeof raw !== "object") return defaultSave(now);
  const parsed = saveSchema.safeParse(raw);
  if (!parsed.success) return defaultSave(now);
  const d = parsed.data;
  const pet = d.pet ? { ...d.pet, acc: d.pet.acc } : null;
  if (pet) {
    // Drop accessories that are not unlocked any more (or never were).
    for (const [slot, id] of Object.entries(pet.acc)) if (!d.unlocked.includes(id)) delete pet.acc[slot as keyof typeof pet.acc];
    // Keep colours valid for the species, but allow any saved hex.
    if (!SPECIES[pet.species]) return defaultSave(now);
  }
  return { ...d, version: SAVE_VERSION, pet, savedAt: d.savedAt || now };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Time away is gentle: stats drift for at most ten hours, the pet naps while you are gone,
 * and nothing ever falls low enough to make a returning student feel bad.
 */
export function applyAway(stats: Stats, awayMs: number): Stats {
  const h = Math.min(10, Math.max(0, awayMs / 3_600_000));
  if (h < 0.01) return stats;
  const floor = 38;
  const next: Stats = {
    hunger: Math.max(Math.min(stats.hunger, floor), stats.hunger - 6 * h),
    happiness: Math.max(Math.min(stats.happiness, floor + 7), stats.happiness - 3 * h),
    energy: clamp(stats.energy + 12 * h),
    cleanliness: Math.max(Math.min(stats.cleanliness, floor + 5), stats.cleanliness - 2.5 * h),
    health: clamp(stats.health + 2 * h),
  };
  // Never come back to a neglected pet.
  next.hunger = Math.max(next.hunger, floor);
  next.happiness = Math.max(next.happiness, floor + 7);
  next.cleanliness = Math.max(next.cleanliness, floor + 5);
  next.health = Math.max(next.health, 65);
  next.energy = Math.max(next.energy, 50);
  return roundStats(next);
}

export function roundStats(s: Stats): Stats {
  return {
    hunger: Math.round(clamp(s.hunger) * 10) / 10,
    happiness: Math.round(clamp(s.happiness) * 10) / 10,
    energy: Math.round(clamp(s.energy) * 10) / 10,
    cleanliness: Math.round(clamp(s.cleanliness) * 10) / 10,
    health: Math.round(clamp(s.health) * 10) / 10,
  };
}

/** One live tick of `seconds`. Gentle floors so the pet never gets truly unwell. */
export function tickStats(s: Stats, seconds: number, opts: { asleep: boolean; playing: boolean; inBath: boolean }): Stats {
  const m = seconds / 60;
  const next = { ...s };
  next.hunger = Math.max(Math.min(s.hunger, 12), s.hunger - 0.8 * m);
  next.happiness = Math.max(Math.min(s.happiness, 15), s.happiness - (opts.playing ? 0 : 0.45) * m);
  if (opts.asleep) next.energy = clamp(s.energy + 7 * m);
  else next.energy = Math.max(Math.min(s.energy, 10), s.energy - (opts.playing ? 1.4 : 0.45) * m);
  if (!opts.inBath) next.cleanliness = Math.max(Math.min(s.cleanliness, 15), s.cleanliness - (opts.playing ? 0.8 : 0.3) * m);
  const wellCared = next.hunger > 30 && next.cleanliness > 30 && next.energy > 20 && next.happiness > 30;
  next.health = wellCared ? clamp(s.health + 0.35 * m) : Math.max(Math.min(s.health, 45), s.health - 0.25 * m);
  return roundStats(next);
}

export function addStats(s: Stats, delta: Partial<Stats>): Stats {
  return roundStats({
    hunger: s.hunger + (delta.hunger ?? 0),
    happiness: s.happiness + (delta.happiness ?? 0),
    energy: s.energy + (delta.energy ?? 0),
    cleanliness: s.cleanliness + (delta.cleanliness ?? 0),
    health: s.health + (delta.health ?? 0),
  });
}
